"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listenToItems, swapItemIndexes } from "@/lib/firestore";
import { VotingItem } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ItemCard from "@/components/ItemCard";
import ItemModal from "@/components/ItemModal";
import PrintView from "@/components/PrintView";
import AddItemModal from "@/components/AddItemModal";

type Filter = "Todos" | "Pendentes" | "A Favor" | "Contra" | "Abster" | "Aparte" | "Destaque" | "Liana Cirne";

export default function SessionPage() {
  return (
    <AuthGuard>
      <SessionDetail />
    </AuthGuard>
  );
}

function SessionDetail() {
  const params = useParams();
  const sessionId = params.id as string;
  const { user } = useAuth();

  const [items, setItems] = useState<VotingItem[]>([]);
  const [filter, setFilter] = useState<Filter>("Todos");
  const [selectedItem, setSelectedItem] = useState<VotingItem | null>(null);
  const [printing, setPrinting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToItems(sessionId, setItems);
    return () => unsub();
  }, [sessionId]);

  // Sync selected item with live updates
  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filtered = useMemo(() => {
    // Em modo reordenamento, sempre mostra todos (filtro desativado)
    if (reordering) return items;
    switch (filter) {
      case "Pendentes":    return items.filter((i) => !i.vote && !i.fazerAparte && !i.fazerDestaque);
      case "A Favor":      return items.filter((i) => i.vote === "A Favor");
      case "Contra":       return items.filter((i) => i.vote === "Contra");
      case "Abster":       return items.filter((i) => i.vote === "Abster");
      case "Aparte":       return items.filter((i) => i.fazerAparte);
      case "Destaque":     return items.filter((i) => i.fazerDestaque);
      case "Liana Cirne":  return items.filter((i) => /liana/i.test(i.author));
      default:             return items;
    }
  }, [items, filter, reordering]);

  async function handleSwap(item: VotingItem, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === item.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const target = items[targetIdx];
    setSwapping(item.id);
    try { await swapItemIndexes(sessionId, item, target); }
    finally { setSwapping(null); }
  }

  const oriented = items.filter((i) => i.vote || i.fazerAparte || i.fazerDestaque).length;
  const progress = items.length > 0 ? Math.round((oriented / items.length) * 100) : 0;
  const lianaCirneCount = items.filter((i) => /liana/i.test(i.author)).length;
  const userName = user?.displayName ?? user?.email ?? "Usuário";

  const filters: { label: string; value: Filter; count?: number }[] = [
    { label: "Todos", value: "Todos", count: items.length },
    { label: "Pendentes", value: "Pendentes", count: items.filter((i) => !i.vote && !i.fazerAparte).length },
    { label: "A Favor", value: "A Favor" },
    { label: "Contra", value: "Contra" },
    { label: "Abster", value: "Abster" },
    { label: "Aparte", value: "Aparte" },
    { label: "Destaque", value: "Destaque" },
    { label: "⭐ Liana Cirne", value: "Liana Cirne", count: lianaCirneCount },
  ];

  if (printing) {
    return <PrintView items={items} onClose={() => setPrinting(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-6 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <Link href="/" className="text-sm text-red-800 hover:text-red-900 font-medium transition">
            ← Voltar
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:border-red-300 hover:text-red-800 text-gray-600 px-3 py-1.5 rounded-xl transition shadow-sm"
            >
              + Adicionar item
            </button>
            <button
              onClick={() => setReordering((r) => !r)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition shadow-sm
                ${reordering
                  ? "bg-red-900 text-white border-red-900"
                  : "bg-white border-gray-200 hover:border-red-300 hover:text-red-800 text-gray-600"}`}
            >
              {reordering ? "✓ Concluir" : "↕ Reordenar"}
            </button>
            <button
              onClick={() => setPrinting(true)}
              className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:border-red-300 hover:text-red-800 text-gray-600 px-3 py-1.5 rounded-xl transition shadow-sm"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Reorder mode banner */}
        {reordering && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-amber-700 text-sm font-medium">
              ↕ Modo reordenamento ativo — use as setas para mover os itens. Filtros desativados.
            </span>
          </div>
        )}

        {/* Progress card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              {oriented} de {items.length} itens orientados
            </span>
            <span className="text-sm font-bold text-red-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-red-800 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
            <span className="text-green-700 font-medium">✅ {items.filter((i) => i.vote === "A Favor").length} a favor</span>
            <span className="text-red-600 font-medium">❌ {items.filter((i) => i.vote === "Contra").length} contra</span>
            <span>⚪ {items.filter((i) => i.vote === "Abster").length} abster</span>
            <span className="text-amber-600 font-medium">✋ {items.filter((i) => i.fazerAparte).length} aparte</span>
            <span className="text-sky-600 font-medium">🔵 {items.filter((i) => i.fazerDestaque).length} destaque</span>
          </div>
        </div>

        {/* Filters (hidden in reorder mode) */}
        {!reordering && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [-ms-overflow-style:none] [scrollbar-width:none]">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition
                  ${filter === f.value
                    ? "bg-red-900 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-red-200 hover:text-red-800"}`}
              >
                {f.label}
                {f.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                    ${filter === f.value ? "bg-red-800 text-red-100" : "bg-gray-100 text-gray-500"}`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Items list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm">Nenhum item neste filtro</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2">
                {/* Reorder arrows */}
                {reordering && (
                  <div className="flex flex-col gap-1 pt-4 flex-shrink-0">
                    <button
                      onClick={() => handleSwap(item, "up")}
                      disabled={idx === 0 || swapping === item.id}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleSwap(item, "down")}
                      disabled={idx === filtered.length - 1 || swapping === item.id}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      ↓
                    </button>
                    <span className="text-xs text-gray-300 text-center">{idx + 1}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <ItemCard
                    item={item}
                    sessionId={sessionId}
                    userName={userName}
                    onDetails={() => !reordering && setSelectedItem(item)}
                    reordering={reordering}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>

      {selectedItem && !reordering && (
        <ItemModal
          item={selectedItem}
          sessionId={sessionId}
          userName={userName}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {addingItem && (
        <AddItemModal
          sessionId={sessionId}
          nextIndex={items.length}
          onClose={() => setAddingItem(false)}
        />
      )}
    </div>
  );
}
