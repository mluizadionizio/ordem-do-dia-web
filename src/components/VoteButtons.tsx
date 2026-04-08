"use client";

import { VoteOption } from "@/lib/types";

interface Props {
  vote: VoteOption;
  fazerAparte: boolean;
  fazerDestaque: boolean;
  onVote: (v: VoteOption) => void;
  onAparte: (v: boolean) => void;
  onDestaque: (v: boolean) => void;
  disabled?: boolean;
}

const VOTE_OPTIONS: { label: string; value: VoteOption; color: string; active: string }[] = [
  { label: "A Favor", value: "A Favor", color: "border-green-200 text-green-700 hover:bg-green-50", active: "bg-green-500 text-white border-green-500" },
  { label: "Contra", value: "Contra", color: "border-red-200 text-red-700 hover:bg-red-50", active: "bg-red-500 text-white border-red-500" },
  { label: "Abster", value: "Abster", color: "border-gray-300 text-gray-600 hover:bg-gray-50", active: "bg-gray-500 text-white border-gray-500" },
];

export default function VoteButtons({ vote, fazerAparte, fazerDestaque, onVote, onAparte, onDestaque, disabled }: Props) {
  return (
    <div className="space-y-3">
      {/* Vote buttons */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Orientação de Voto</p>
        <div className="flex gap-2">
          {VOTE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onVote(vote === opt.value ? null : opt.value)}
              disabled={disabled}
              className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition
                ${vote === opt.value ? opt.active : opt.color}
                disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fazer Aparte e Destaque — toggles independentes */}
      <div className="flex gap-2">
        <button
          onClick={() => onAparte(!fazerAparte)}
          disabled={disabled}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition
            ${fazerAparte
              ? "bg-amber-500 text-white border-amber-500"
              : "border-amber-200 text-amber-700 hover:bg-amber-50"}
            disabled:opacity-50`}
        >
          {fazerAparte ? "✋ Aparte (ativo)" : "✋ Fazer Aparte"}
        </button>
        <button
          onClick={() => onDestaque(!fazerDestaque)}
          disabled={disabled}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition
            ${fazerDestaque
              ? "bg-sky-500 text-white border-sky-500"
              : "border-sky-200 text-sky-700 hover:bg-sky-50"}
            disabled:opacity-50`}
        >
          {fazerDestaque ? "🔵 Destaque (ativo)" : "🔵 Fazer Destaque"}
        </button>
      </div>
    </div>
  );
}
