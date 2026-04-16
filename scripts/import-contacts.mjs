/**
 * Script de importação em massa de contatos para o Firestore.
 * Usa as credenciais do Firebase do projeto (sem precisar de service account).
 *
 * ATENÇÃO: requer login com Google ou email/senha antes de rodar.
 * O script abre um servidor local mínimo para autenticar via popup.
 *
 * Como usar:
 *   node scripts/import-contacts.mjs /Users/malumatos/Downloads/gabinete_virtual_importacao.csv
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { parse } from "path";
const require = createRequire(import.meta.url);

// Usa fetch nativo (Node 18+) ou node-fetch
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: node scripts/import-contacts.mjs <caminho-do-csv>");
  process.exit(1);
}

// Lê e parseia o CSV
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const values = parseCSVLine(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
      return obj;
    })
    .filter((r) => r["Nome"]?.trim());
}

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// Envia para a API do Firestore via REST (sem SDK, sem autenticação necessária se a regra for pública)
// Como usamos regras autenticadas, vamos usar o Firebase Client SDK via HTTP REST com API key
const FIREBASE_PROJECT_ID = "ordem-do-dia-9699d";
const FIREBASE_API_KEY = "AIzaSyCt-uADzj6vEFJNSKgqRcxqo_8bq3SNDjg";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Autenticação: usa API key para login com email/senha
async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Login falhou: ${err.error?.message}`);
  }
  const data = await res.json();
  return data.idToken;
}

// Converte objeto JS para formato de documento Firestore
function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map((v) => ({ stringValue: String(v) })) } };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value !== null && value !== undefined && value !== "") {
      fields[key] = { stringValue: String(value) };
    }
  }
  return { fields };
}

// Batch write (máx 500 por batch)
async function batchWrite(token, docs) {
  const writes = docs.map(({ id, data }) => ({
    update: {
      name: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/contacts/${id}`,
      fields: toFirestoreDoc(data).fields,
    },
  }));

  const res = await fetch(
    `${FIRESTORE_BASE}:batchWrite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ writes }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Batch write falhou: ${err}`);
  }
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rowToContact(row, importedBy) {
  const tags = (row["Tags"] || "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    name: row["Nome"]?.trim() || "",
    nickname: row["Apelido"]?.trim() || undefined,
    category: row["Categoria"]?.trim() || "Cidadão",
    phone: row["Telefone"]?.trim() || undefined,
    email: row["Email"]?.trim() || undefined,
    address: row["Endereço"]?.trim() || undefined,
    neighborhood: row["Bairro"]?.trim() || undefined,
    city: row["Cidade"]?.trim() || undefined,
    tags,
    notes: row["Observações"]?.trim() || undefined,
    createdAt: new Date().toISOString(),
    createdBy: importedBy,
  };
}

async function main() {
  // Pede credenciais
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n=== Importador de Contatos — Gabinete Liana Cirne ===\n");
  const email = await ask("Email do usuário Firebase: ");
  const password = await ask("Senha: ");

  console.log("\nAutenticando...");
  let token;
  try {
    token = await signIn(email.trim(), password.trim());
    console.log("✓ Autenticado com sucesso!\n");
  } catch (e) {
    console.error("✗ " + e.message);
    rl.close();
    process.exit(1);
  }
  rl.close();

  // Lê CSV (remove BOM UTF-8 se presente)
  let csvContent = readFileSync(csvPath, "utf-8");
  if (csvContent.charCodeAt(0) === 0xfeff) csvContent = csvContent.slice(1);

  const rows = parseCSV(csvContent);
  console.log(`CSV lido: ${rows.length} contatos\n`);

  const BATCH_SIZE = 500;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const docs = batch
      .map((row) => rowToContact(row, email.trim()))
      .filter((c) => c.name)
      .map((data) => ({ id: generateId(), data }));

    try {
      await batchWrite(token, docs);
      imported += docs.length;
      const pct = Math.round((imported / rows.length) * 100);
      process.stdout.write(`\r  Importado: ${imported}/${rows.length} (${pct}%)   `);
    } catch (e) {
      errors++;
      console.error(`\n✗ Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${e.message}`);
    }
  }

  console.log(`\n\n✓ Importação concluída!`);
  console.log(`  Importados: ${imported}`);
  if (errors > 0) console.log(`  Erros:      ${errors} batches`);
}

main().catch((e) => { console.error(e); process.exit(1); });
