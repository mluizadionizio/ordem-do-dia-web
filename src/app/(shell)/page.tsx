"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listenToSessions, deleteSession } from "@/lib/firestore";
import { VotingSession } from "@/lib/types";

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function HomePage() {
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToSessions(setSessions);
    return () => unsub();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir a sessão "${title}"?`)) return;
    setDeleting(id);
    try { await deleteSession(id); }
    catch { alert("Erro ao excluir sessão."); }
    finally { setDeleting(null); }
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sessões</h2>
            <p className="text-sm text-gray-500 mt-0.5">Pautas importadas para orientação</p>
          </div>
          <Link
            href="/nova"
            className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm whitespace-nowrap"
          >
            + Nova Sessão
          </Link>
        </div>

        {/* Empty state */}
        {sessions.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-semibold text-gray-500">Nenhuma sessão ainda</p>
            <p className="text-sm mt-1">Importe uma Ordem do Dia para começar</p>
            <Link
              href="/nova"
              className="inline-block mt-6 bg-red-900 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Importar pauta
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center p-5 gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-800 text-base">📋</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate leading-tight">
                      {s.sessionTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(s.importedAt)} · {s.importedBy}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/sessao/${s.id}`}
                      className="text-sm font-semibold text-red-900 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition"
                    >
                      Abrir
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id, s.sessionTitle)}
                      disabled={deleting === s.id}
                      className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg transition disabled:opacity-40 text-base"
                      title="Excluir"
                    >
                      {deleting === s.id ? "…" : "🗑"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
