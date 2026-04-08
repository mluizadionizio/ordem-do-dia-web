"use client";

import { useEffect, useState } from "react";
import { VotingItem } from "@/lib/types";
import { addItemToSession } from "@/lib/firestore";

interface Props {
  sessionId: string;
  nextIndex: number;
  onClose: () => void;
}

const ITEM_TYPES = ["REQUERIMENTO", "PLE", "PDL", "EMENDA", "OUTRO"];

export default function AddItemModal({ sessionId, nextIndex, onClose }: Props) {
  const [itemType, setItemType] = useState("REQUERIMENTO");
  const [itemNumber, setItemNumber] = useState("");
  const [author, setAuthor] = useState("");
  const [fullText, setFullText] = useState("");
  const [destaque, setDestaque] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    if (!fullText.trim()) {
      setError("O texto do item é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const newItem: VotingItem = {
        id: crypto.randomUUID(),
        index: nextIndex,
        itemType,
        itemNumber: itemNumber.trim(),
        author: author.trim(),
        fullText: fullText.trim(),
        destaque: destaque.trim() || undefined,
        vote: null,
        fazerAparte: false,
        fazerDestaque: false,
        notes: "",
      };
      await addItemToSession(sessionId, newItem);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Erro ao salvar o item. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">Adicionar item manualmente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tipo de proposição
            </label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setItemType(t)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition
                    ${itemType === t
                      ? "bg-red-900 text-white border-red-900"
                      : "border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-800"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Número */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Número
            </label>
            <input
              type="text"
              value={itemNumber}
              onChange={(e) => setItemNumber(e.target.value)}
              placeholder="ex: 1843/2026"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Autor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Autor(a)
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="ex: Vereadora Liana Cirne"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Texto completo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Texto completo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              placeholder="Descreva o conteúdo completo da proposição..."
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Destaque */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Destaque / Observação (opcional)
            </label>
            <textarea
              value={destaque}
              onChange={(e) => setDestaque(e.target.value)}
              placeholder="Informações adicionais, contexto, justificativa..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullText.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-900 hover:bg-red-800 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar item"}
          </button>
        </div>
      </div>
    </div>
  );
}
