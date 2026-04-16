import { Contact } from "./types";

type ContactRow = {
  Nome: string;
  Apelido: string;
  Categoria: string;
  Telefone: string;
  Email: string;
  Endereço: string;
  Bairro: string;
  Cidade: string;
  Tags: string;
  Observações: string;
  "Criado em": string;
  "Criado por": string;
};

function toRows(contacts: Contact[]): ContactRow[] {
  return contacts.map((c) => ({
    Nome: c.name,
    Apelido: c.nickname ?? "",
    Categoria: c.category,
    Telefone: c.phone ?? "",
    Email: c.email ?? "",
    Endereço: c.address ?? "",
    Bairro: c.neighborhood ?? "",
    Cidade: c.city ?? "",
    Tags: c.tags.join("; "),
    Observações: c.notes ?? "",
    "Criado em": c.createdAt
      ? new Date(c.createdAt).toLocaleDateString("pt-BR")
      : "",
    "Criado por": c.createdBy,
  }));
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportContactsToCSV(contacts: Contact[]): void {
  const rows = toRows(contacts);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]) as (keyof ContactRow)[];
  const escape = (v: string) =>
    `"${String(v).replace(/"/g, '""')}"`;

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `contatos_gabinete_${timestamp()}.csv`);
}

export async function exportContactsToXLSX(contacts: Contact[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = toRows(contacts);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contatos");

  // Auto column width
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof ContactRow]).length)
    ),
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `contatos_gabinete_${timestamp()}.xlsx`);
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}
