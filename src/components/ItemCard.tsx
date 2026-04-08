"use client";

import { useState } from "react";
import { VotingItem, VoteOption } from "@/lib/types";
import { updateVote, updateAparte, updateDestaque } from "@/lib/firestore";

const TYPE_COLORS: Record<string, string> = {
  REQUERIMENTO: "bg-sky-100 text-sky-800",
  PLE: "bg-purple-100 text-purple-800",
  PDL: "bg-indigo-100 text-indigo-800",
  EMENDA: "bg-orange-100 text-orange-800",
  OUTRO: "bg-gray-100 text-gray-600",
};

const VOTE_OPTIONS: { label: string; value: VoteOption; base: string; active: string }[] = [
  { label: "A Favor", value: "A Favor", base: "border-green-200 text-green-700 hover:bg-green-50", active: "bg-green-600 text-white border-green-600" },
  { label: "Contra", value: "Contra", base: "border-red-200 text-red-700 hover:bg-red-50", active: "bg-red-600 text-white border-red-600" },
  { label: "Abster", value: "Abster", base: "border-gray-200 text-gray-600 hover:bg-gray-50", active: "bg-gray-500 text-white border-gray-500" },
];

function isLianaCirne(author: string) {
  return /liana/i.test(author);
}

interface Props {
  item: VotingItem;
  sessionId: string;
  userName: string;
  onDetails: () => void;
  reordering?: boolean;
}

export default function ItemCard({ item, sessionId, userName, onDetails, reordering = false }: Props) {
  const [saving, setSaving] = useState(false);
  const liana = isLianaCirne(item.author);
  const typeColor = TYPE_COLORS[item.itemType] ?? TYPE_COLORS.OUTRO;

  async function handleVote(vote: VoteOption) {
    setSaving(true);
    try { await updateVote(sessionId, item.id, vote === item.vote ? null : vote, userName); }
    finally { setSaving(false); }
  }

  async function handleAparte() {
    setSaving(true);
    try { await updateAparte(sessionId, item.id, !item.fazerAparte, userName); }
    finally { setSaving(false); }
  }

  async function handleDestaque() {
    setSaving(true);
    try { await updateDestaque(sessionId, item.id, !item.fazerDestaque, userName); }
    finally { setSaving(false); }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-shadow hover:shadow-md
      ${liana
        ? "border-l-4 border-l-amber-400 border-t-amber-100 border-r-amber-100 border-b-amber-100"
        : "border-gray-200"}`}
    >
      {/* Liana Cirne banner */}
      {liana && (
        <div className="bg-amber-50 px-4 py-1.5 rounded-t-xl flex items-center gap-1.5 border-b border-amber-100">
          <span className="text-amber-600 text-xs">⭐</span>
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Autoria de Liana Cirne</span>
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
            {item.itemType}
          </span>
          {item.itemNumber && (
            <span className="text-xs text-gray-500 font-medium">Nº {item.itemNumber}</span>
          )}
          {item.vote && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-auto
              ${item.vote === "A Favor" ? "bg-green-100 text-green-700" :
                item.vote === "Contra" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-600"}`}>
              {item.vote}
            </span>
          )}
          {item.fazerAparte && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              ✋ Aparte
            </span>
          )}
          {item.fazerDestaque && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              🔵 Destaque
            </span>
          )}
        </div>

        {/* Author */}
        {item.author && (
          <p className="text-xs text-gray-500 mb-2">por {item.author}</p>
        )}

        {/* Text preview */}
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-3">
          {item.fullText}
        </p>

        {/* Destaque inline */}
        {item.destaque && (
          <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-1.5 mb-3 line-clamp-2">
            ℹ️ {item.destaque}
          </p>
        )}

        {/* Doc suggestion */}
        {item.docSuggestion && (
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mb-3">
            📋 Sugestão doc.: {item.docSuggestion}
          </p>
        )}

        {/* Vote buttons inline — ocultos no modo reordenamento */}
        {!reordering && <div className="flex flex-wrap gap-2 items-center">
          {VOTE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleVote(opt.value)}
              disabled={saving}
              className={`flex-1 min-w-[72px] py-1.5 px-2 rounded-lg border text-xs font-semibold transition
                ${item.vote === opt.value ? opt.active : opt.base}
                disabled:opacity-40`}
            >
              {opt.label}
            </button>
          ))}

          <button
            onClick={handleAparte}
            disabled={saving}
            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition
              ${item.fazerAparte
                ? "bg-amber-500 text-white border-amber-500"
                : "border-amber-200 text-amber-700 hover:bg-amber-50"}
              disabled:opacity-40`}
          >
            ✋ Aparte
          </button>
          <button
            onClick={handleDestaque}
            disabled={saving}
            className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition
              ${item.fazerDestaque
                ? "bg-sky-500 text-white border-sky-500"
                : "border-sky-200 text-sky-700 hover:bg-sky-50"}
              disabled:opacity-40`}
          >
            🔵 Destaque
          </button>

          <button
            onClick={onDetails}
            className="ml-auto text-gray-400 hover:text-red-700 text-xs underline-offset-2 hover:underline transition"
          >
            Ver detalhes
          </button>
        </div>}

        {/* Notes preview */}
        {item.notes && (
          <p className="text-xs text-gray-400 mt-2 italic line-clamp-1">📝 {item.notes}</p>
        )}
      </div>
    </div>
  );
}
