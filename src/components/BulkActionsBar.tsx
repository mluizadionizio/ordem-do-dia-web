"use client";

import { useState } from "react";
import { ContactCategory } from "@/lib/types";

interface Props {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddTags: (tags: string[]) => Promise<void>;
  onChangeCategory: (category: ContactCategory | string) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  allTags: string[];
  allCategories: string[];
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onAddTags,
  onChangeCategory,
  onDelete,
  onCancel,
  allTags,
  allCategories,
}: Props) {
  const [panel, setPanel] = useState<"none" | "tags" | "category">("none");
  const [tagInput, setTagInput] = useState("");
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const tagSuggestions = allTags.filter(
    (t) => t.toLowerCase().includes(tagInput.toLowerCase()) && !pendingTags.includes(t)
  );

  function addPendingTag(tag: string) {
    const t = tag.trim();
    if (t && !pendingTags.includes(t)) setPendingTags((prev) => [...prev, t]);
    setTagInput("");
  }

  async function confirmAddTags() {
    if (!pendingTags.length) return;
    setLoading(true);
    try {
      await onAddTags(pendingTags);
      setPendingTags([]);
      setPanel("none");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCategory() {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      await onChangeCategory(selectedCategory);
      setSelectedCategory("");
      setPanel("none");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-4 px-4 pointer-events-none">
      {/* Sub-panel: tags */}
      {panel === "tags" && (
        <div className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-4 mb-2">
          <p className="text-sm font-semibold text-gray-800 mb-3">Adicionar tags aos {selectedCount} contatos selecionados</p>
          {/* Selected tags */}
          {pendingTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {pendingTags.map((t) => (
                <span key={t} className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => setPendingTags((p) => p.filter((x) => x !== t))} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}
          {/* Tag input */}
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                  e.preventDefault();
                  addPendingTag(tagInput);
                }
              }}
              placeholder="Digitar tag e Enter..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {tagInput && tagSuggestions.length > 0 && (
              <ul className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-10">
                {tagSuggestions.slice(0, 8).map((t) => (
                  <li key={t}>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); addPendingTag(t); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 hover:text-red-800"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setPanel("none")} className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button
              onClick={confirmAddTags}
              disabled={pendingTags.length === 0 || loading}
              className="text-sm px-4 py-2 rounded-xl bg-red-900 text-white font-medium hover:bg-red-800 disabled:opacity-40 transition"
            >
              {loading ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Sub-panel: category */}
      {panel === "category" && (
        <div className="pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-4 mb-2">
          <p className="text-sm font-semibold text-gray-800 mb-3">Mudar categoria dos {selectedCount} contatos selecionados</p>
          <select
            autoFocus
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Selecionar categoria...</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setPanel("none")} className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button
              onClick={confirmCategory}
              disabled={!selectedCategory || loading}
              className="text-sm px-4 py-2 rounded-xl bg-red-900 text-white font-medium hover:bg-red-800 disabled:opacity-40 transition"
            >
              {loading ? "Salvando..." : "Aplicar"}
            </button>
          </div>
        </div>
      )}

      {/* Main action bar */}
      <div className="pointer-events-auto w-full max-w-lg bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Select all toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={allSelected ? onDeselectAll : onSelectAll}
            className="w-4 h-4 accent-red-400 cursor-pointer"
          />
          <span className="text-sm font-medium">
            {selectedCount} de {totalCount}
          </span>
        </label>

        <div className="flex-1" />

        <button
          onClick={() => setPanel(panel === "tags" ? "none" : "tags")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition font-medium ${
            panel === "tags" ? "bg-red-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          Tags
        </button>

        <button
          onClick={() => setPanel(panel === "category" ? "none" : "category")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition font-medium ${
            panel === "category" ? "bg-red-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
          Categoria
        </button>

        <button
          onClick={confirmDelete}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Excluir
        </button>

        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
