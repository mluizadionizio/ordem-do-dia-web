"use client";

import { useRef, useState } from "react";
import { createContact } from "@/lib/contacts-firestore";
import { Contact, ContactCategory, CONTACT_CATEGORIES } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

type RawRow = Record<string, string>;
type MappedContact = Omit<Contact, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">;

function parseCategory(raw: string): ContactCategory {
  const match = CONTACT_CATEGORIES.find(
    (c) => c.toLowerCase() === (raw ?? "").toLowerCase()
  );
  return match ?? "Outro";
}

function rowToContact(row: RawRow): MappedContact {
  const tags = (row["Tags"] ?? row["tags"] ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    name: row["Nome"] ?? row["name"] ?? "",
    nickname: row["Apelido"] ?? row["nickname"] ?? undefined,
    category: parseCategory(row["Categoria"] ?? row["category"] ?? "Outro"),
    phone: row["Telefone"] ?? row["phone"] ?? undefined,
    email: row["Email"] ?? row["email"] ?? undefined,
    address: row["Endereço"] ?? row["address"] ?? undefined,
    neighborhood: row["Bairro"] ?? row["neighborhood"] ?? undefined,
    city: row["Cidade"] ?? row["city"] ?? undefined,
    tags,
    notes: row["Observações"] ?? row["notes"] ?? undefined,
  };
}

interface Props {
  onClose: () => void;
}

export default function ImportContactsModal({ onClose }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [filename, setFilename] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setRows([]);
    setFilename(file.name);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });
      setRows(parsed);
    } catch (err) {
      console.error("[ImportContacts] falha ao ler arquivo:", err);
      setError("Erro ao ler o arquivo. Verifique se é um CSV válido.");
    }
  }

  async function handleImport() {
    if (!user || rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setError("");

    const contacts = rows
      .map(rowToContact)
      .filter((c) => c.name.trim());

    const BATCH = 20;
    let done = 0;

    try {
      for (let i = 0; i < contacts.length; i += BATCH) {
        const batch = contacts.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map((c) => createContact(c, user)));
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          throw (failed[0] as PromiseRejectedResult).reason;
        }
        done += batch.length;
        setProgress(Math.round((done / contacts.length) * 100));
      }
      setDone(true);
    } catch (err) {
      console.error("[ImportContacts] falha ao salvar no Firestore:", err);
      const code = (err as { code?: string })?.code;
      const msg =
        code === "permission-denied"
          ? "Sem permissão para salvar no banco. Verifique as regras do Firestore."
          : err instanceof Error
          ? err.message
          : "tente novamente.";
      setError(`Erro ao importar contatos: ${msg}`);
    } finally {
      setImporting(false);
    }
  }

  const previewRows = rows.slice(0, 5);
  const validCount = rows.filter((r) => (r["Nome"] ?? r["name"] ?? "").trim()).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-base">Importar contatos via CSV</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {done ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-semibold text-gray-800">Importação concluída!</p>
              <p className="text-sm text-gray-500 mt-1">{validCount} contatos importados com sucesso.</p>
              <button
                onClick={onClose}
                className="mt-6 bg-red-900 hover:bg-red-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Format info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
                <p className="font-semibold mb-1">Colunas esperadas no CSV:</p>
                <p className="font-mono">Nome, Apelido, Categoria, Telefone, Email, Endereço, Bairro, Cidade, Tags, Observações</p>
                <p className="mt-1 text-blue-600">Tags: separadas por <strong>;</strong> (ex: autismo; saúde)</p>
                <p className="text-blue-600">Categorias: {CONTACT_CATEGORIES.join(", ")}</p>
              </div>

              {/* File picker */}
              {!rows.length ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-red-400 rounded-xl p-10 text-center cursor-pointer transition"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <p className="text-3xl mb-2">📂</p>
                  <p className="text-sm font-medium text-gray-700">Clique para selecionar arquivo CSV</p>
                  <p className="text-xs text-gray-400 mt-1">Também aceita .xlsx</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{filename}</span> — {validCount} contato{validCount !== 1 ? "s" : ""} válido{validCount !== 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={() => { setRows([]); setFilename(""); setError(""); }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Trocar arquivo
                    </button>
                  </div>

                  {/* Preview table */}
                  {previewRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="text-xs w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(previewRows[0]).slice(0, 6).map((k) => (
                              <th key={k} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{k}</th>
                            ))}
                            {Object.keys(previewRows[0]).length > 6 && (
                              <th className="px-3 py-2 text-gray-400">...</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.values(row).slice(0, 6).map((v, j) => (
                                <td key={j} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{String(v)}</td>
                              ))}
                              {Object.values(row).length > 6 && (
                                <td className="px-3 py-2 text-gray-400">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows.length > 5 && (
                        <p className="text-xs text-gray-400 px-3 py-2 text-center">
                          + {rows.length - 5} linha{rows.length - 5 !== 1 ? "s" : ""} adicionais
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress */}
                  {importing && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Importando...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-red-800 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!done && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={importing}
              className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="flex-1 bg-red-900 hover:bg-red-800 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${validCount} contato${validCount !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
