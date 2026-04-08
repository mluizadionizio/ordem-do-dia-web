"use client";

import { useEffect } from "react";
import { VotingItem } from "@/lib/types";

const VOTE_LABEL: Record<string, string> = {
  "A Favor": "A FAVOR",
  "Contra": "CONTRA",
  "Abster": "ABSTER",
};

const VOTE_COLOR: Record<string, string> = {
  "A Favor": "text-green-800",
  "Contra": "text-red-800",
  "Abster": "text-gray-600",
};

function isLianaCirne(author: string) {
  return /liana/i.test(author);
}

interface Props {
  items: VotingItem[];
  onClose: () => void;
}

export default function PrintView({ items, onClose }: Props) {
  useEffect(() => {
    const timeout = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timeout);
  }, []);

  const oriented = items.filter((i) => i.vote || i.fazerAparte || i.fazerDestaque);
  const notOriented = items.filter((i) => !i.vote && !i.fazerAparte && !i.fazerDestaque);

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only toolbar */}
      <div className="print:hidden bg-red-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-bold text-sm">Pré-visualização de Impressão</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-white text-red-900 font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-red-50 transition"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={onClose}
            className="border border-red-300 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-800 transition"
          >
            ✕ Fechar
          </button>
        </div>
      </div>

      {/* Print content — fontes maiores para leitura confortável */}
      <div className="max-w-[750px] mx-auto px-10 py-10 print:px-6 print:py-6">

        {/* Cabeçalho */}
        <div className="text-center mb-8 pb-6 border-b-[3px] border-gray-800">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Gabinete da Vereadora</p>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">LIANA CIRNE</h1>
          <p className="text-lg font-bold text-gray-700 uppercase tracking-wide">
            Orientações de Voto — Ordem do Dia
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        {/* Resumo */}
        <div className="flex gap-6 mb-8 text-base font-semibold text-gray-700 border border-gray-200 rounded-xl p-4 bg-gray-50 print:bg-white">
          <span>Total: <strong>{items.length}</strong></span>
          <span className="text-green-800">A Favor: <strong>{items.filter(i => i.vote === "A Favor").length}</strong></span>
          <span className="text-red-800">Contra: <strong>{items.filter(i => i.vote === "Contra").length}</strong></span>
          <span className="text-gray-600">Abster: <strong>{items.filter(i => i.vote === "Abster").length}</strong></span>
          <span className="text-amber-700">Aparte: <strong>{items.filter(i => i.fazerAparte).length}</strong></span>
          <span className="text-sky-700">Destaque: <strong>{items.filter(i => i.fazerDestaque).length}</strong></span>
          <span className="text-gray-400">Pendentes: <strong>{notOriented.length}</strong></span>
        </div>

        {/* Itens */}
        <div className="space-y-5">
          {items.map((item, idx) => {
            const liana = isLianaCirne(item.author);
            return (
              <div
                key={item.id}
                className={`border-2 rounded-xl p-5 break-inside-avoid
                  ${liana
                    ? "border-amber-300 bg-amber-50 print:bg-amber-50"
                    : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Número e tipo */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-base font-black text-gray-700">
                        {idx + 1}.
                      </span>
                      <span className="text-sm font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {item.itemType}
                      </span>
                      {item.itemNumber && (
                        <span className="text-sm font-semibold text-gray-600">
                          Nº {item.itemNumber}
                        </span>
                      )}
                      {liana && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                          ⭐ Autoria Liana Cirne
                        </span>
                      )}
                    </div>

                    {/* Autor */}
                    {item.author && (
                      <p className="text-sm text-gray-500 mb-2 font-medium">
                        Autor(a): {item.author}
                      </p>
                    )}

                    {/* Texto */}
                    <p className="text-base text-gray-800 leading-relaxed mb-3">
                      {item.fullText || item.author}
                    </p>

                    {/* Destaque */}
                    {item.destaque && (
                      <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 mb-2">
                        <p className="text-sm text-sky-800 leading-relaxed">
                          <strong>Destaque:</strong> {item.destaque}
                        </p>
                      </div>
                    )}

                    {/* Observações */}
                    {item.notes && (
                      <p className="text-sm text-gray-600 italic mt-1">
                        Obs.: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Orientação de voto */}
                  <div className="flex-shrink-0 text-right min-w-[110px]">
                    {item.vote ? (
                      <p className={`text-lg font-black ${VOTE_COLOR[item.vote]}`}>
                        {VOTE_LABEL[item.vote]}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Sem orientação</p>
                    )}
                    {item.fazerAparte && (
                      <p className="text-sm font-bold text-amber-700 mt-1">
                        ✋ Fazer Aparte
                      </p>
                    )}
                    {item.fazerDestaque && (
                      <p className="text-sm font-bold text-sky-700 mt-1">
                        🔵 Destaque
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="mt-10 pt-5 border-t-2 border-gray-300 text-center">
          <p className="text-sm text-gray-500">
            Gabinete da Vereadora Liana Cirne · Câmara Municipal do Recife
          </p>
        </div>
      </div>
    </div>
  );
}
