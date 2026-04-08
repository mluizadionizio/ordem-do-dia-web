"use client";

import { useEffect, useRef, useState } from "react";
import { VotingItem, VoteOption } from "@/lib/types";
import VoteButtons from "./VoteButtons";
import { updateVote, updateAparte, updateDestaque, updateNotes } from "@/lib/firestore";

interface Props {
  item: VotingItem;
  sessionId: string;
  userName: string;
  onClose: () => void;
}

export default function ItemModal({ item, sessionId, userName, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const notesTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleVote(vote: VoteOption) {
    setSaving(true);
    try { await updateVote(sessionId, item.id, vote, userName); }
    finally { setSaving(false); }
  }

  async function handleAparte(v: boolean) {
    setSaving(true);
    try { await updateAparte(sessionId, item.id, v, userName); }
    finally { setSaving(false); }
  }

  async function handleDestaque(v: boolean) {
    setSaving(true);
    try { await updateDestaque(sessionId, item.id, v, userName); }
    finally { setSaving(false); }
  }

  function handleNotesChange(v: string) {
    setNotes(v);
    clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      await updateNotes(sessionId, item.id, v, userName);
    }, 800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              item.itemType === "REQUERIMENTO" ? "bg-blue-100 text-blue-700" :
              item.itemType === "PLE" ? "bg-purple-100 text-purple-700" :
              item.itemType === "EMENDA" ? "bg-orange-100 text-orange-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {item.itemType}
            </span>
            {item.itemNumber && (
              <span className="text-sm text-gray-500">Nº {item.itemNumber}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Author */}
          {item.author && (
            <p className="text-xs text-gray-500 font-medium">Autor(a): {item.author}</p>
          )}

          {/* Full text */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.fullText}</p>
          </div>

          {/* Destaque */}
          {item.destaque && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wide">Destaque</p>
              <p className="text-sm text-blue-800">{item.destaque}</p>
            </div>
          )}

          {/* Doc suggestion */}
          {item.docSuggestion && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-bold text-green-600 mb-1 uppercase tracking-wide">Sugestão do Doc.</p>
              <p className="text-sm text-green-800">{item.docSuggestion}</p>
            </div>
          )}

          {/* Vote buttons */}
          <VoteButtons
            vote={item.vote}
            fazerAparte={item.fazerAparte}
            fazerDestaque={item.fazerDestaque}
            onVote={handleVote}
            onAparte={handleAparte}
            onDestaque={handleDestaque}
            disabled={saving}
          />

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Observações</p>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Adicione notas ou justificativas..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Audit info */}
          {item.voteUpdatedBy && (
            <p className="text-xs text-gray-400 text-right">
              Voto por {item.voteUpdatedBy}
              {item.voteUpdatedAt ? ` em ${item.voteUpdatedAt.toLocaleString("pt-BR")}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
