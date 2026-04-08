"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSession } from "@/lib/firestore";
import { VotingItem, VotingSession } from "@/lib/types";
import { parseLocalAgenda } from "@/lib/local-parser";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function NovaPage() {
  return (
    <AuthGuard>
      <NovaSessionPage />
    </AuthGuard>
  );
}

function NovaSessionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [status, setStatus] = useState<"idle" | "extracting" | "parsing" | "saving" | "done">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      setError("Por favor, selecione um arquivo .docx");
      return;
    }
    setError("");
    setFilename(file.name);
    setStatus("extracting");
    setStatusMsg("Extraindo texto do arquivo...");
    try {
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setText(result.value);
    } catch {
      setError("Erro ao extrair texto do arquivo.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  async function handleLocalProcess() {
    if (!text.trim()) {
      setError("Cole ou carregue a pauta antes de processar.");
      return;
    }
    setError("");
    setStatus("parsing");
    setStatusMsg("Analisando localmente...");

    try {
      // Pequeno yield para o browser atualizar a UI
      await new Promise((r) => setTimeout(r, 50));

      const { sessionTitle, items: parsed } = parseLocalAgenda(text);

      if (!parsed || parsed.length === 0) {
        setError(
          "Nenhum item encontrado. Verifique se o texto segue o formato oficial (DISCUSSÃO ÚNICA, 1ª DISCUSSÃO, EMENDA Nº…)."
        );
        setStatus("idle");
        setStatusMsg("");
        return;
      }

      setStatus("saving");
      setStatusMsg(`Salvando ${parsed.length} itens...`);

      const sessionId = crypto.randomUUID();
      const session: VotingSession = {
        id: sessionId,
        sessionTitle: sessionTitle ?? filename ?? "Ordem do Dia",
        filename: filename || "pauta.txt",
        importedAt: new Date(),
        importedBy: user?.displayName ?? user?.email ?? "Usuário",
      };

      const items: VotingItem[] = parsed.map((item, idx) => ({
        id: crypto.randomUUID(),
        index: idx,
        itemType: item.itemType ?? "OUTRO",
        itemNumber: item.itemNumber ?? "",
        author: item.author ?? "",
        fullText: item.fullText ?? "",
        destaque: item.destaque ?? undefined,
        docSuggestion: item.docSuggestion ?? undefined,
        vote: null,
        fazerAparte: false,
        fazerDestaque: false,
        notes: "",
      }));

      await createSession(session, items);
      setStatus("done");
      setStatusMsg("Concluído!");
      router.push(`/sessao/${sessionId}`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(`Erro: ${msg}`);
      setStatus("idle");
      setStatusMsg("");
    }
  }

  async function handleProcess() {
    if (!text.trim()) {
      setError("Cole ou carregue a pauta antes de processar.");
      return;
    }
    setError("");
    setStatus("parsing");
    setStatusMsg("Iniciando análise...");

    try {
      // Chama a API com streaming — sem timeout, resposta chega em tempo real
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao conectar com a API");
      }

      // Lê o stream de Server-Sent Events
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Processa linhas SSE completas
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          const data = JSON.parse(line.slice(6));

          // Atualiza mensagem de status em tempo real
          if (data.status) {
            setStatusMsg(data.status);
          }

          // Erro do servidor
          if (data.error) {
            throw new Error(data.error);
          }

          // Resultado final chegou
          if (data.done) {
            if (!data.items || data.items.length === 0) {
              setError("Nenhum item encontrado. Verifique o texto da pauta.");
              setStatus("idle");
              setStatusMsg("");
              return;
            }

            setStatus("saving");
            setStatusMsg(`Salvando ${data.items.length} itens...`);

            const sessionId = crypto.randomUUID();
            const session: VotingSession = {
              id: sessionId,
              sessionTitle: data.sessionTitle ?? filename ?? "Ordem do Dia",
              filename: filename || "pauta.txt",
              importedAt: new Date(),
              importedBy: user?.displayName ?? user?.email ?? "Usuário",
            };

            const items: VotingItem[] = data.items.map(
              (item: Partial<VotingItem>, idx: number) => ({
                id: crypto.randomUUID(),
                index: idx,
                itemType: item.itemType ?? "OUTRO",
                itemNumber: item.itemNumber ?? "",
                author: item.author ?? "",
                fullText: item.fullText ?? "",
                destaque: (item.destaque as string | undefined) ?? undefined,
                docSuggestion: (item.docSuggestion as string | undefined) ?? undefined,
                vote: null,
                fazerAparte: false,
                notes: "",
              })
            );

            await createSession(session, items);
            setStatus("done");
            setStatusMsg("Concluído!");
            router.push(`/sessao/${sessionId}`);
            return;
          }
        }
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(`Erro: ${msg}. Verifique a chave OpenAI e tente novamente.`);
      setStatus("idle");
      setStatusMsg("");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Nova Sessão</h2>

        {/* Drop zone */}
        <div
          onClick={() => !busy && fileRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-4
            ${dragOver ? "border-red-400 bg-red-50" : "border-gray-300 hover:border-red-300 hover:bg-gray-50"}
            ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={onFileInput} />
          <p className="text-3xl mb-2">📄</p>
          {filename ? (
            <p className="text-sm font-medium text-green-700">{filename} — texto extraído</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Arraste o arquivo .docx aqui</p>
              <p className="text-xs text-gray-400 mt-1">ou clique para selecionar</p>
            </>
          )}
        </div>

        {/* Text area */}
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-600">
            Ou cole o texto da pauta diretamente:
          </label>
          {text && (
            <button
              onClick={() => { setText(""); setFilename(""); }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Limpar
            </button>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          placeholder="Cole aqui o texto completo da Ordem do Dia..."
          rows={12}
          className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 mb-4"
        />

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            {error}
          </p>
        )}

        {busy ? (
          <div className="w-full bg-red-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span>{statusMsg || "Processando..."}</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleLocalProcess}
              disabled={busy || !text.trim()}
              className="flex-1 bg-white border border-gray-300 hover:border-red-400 hover:text-red-900 text-gray-700 py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              ⚡ Processar localmente
            </button>
            <button
              onClick={handleProcess}
              disabled={busy || !text.trim()}
              className="flex-1 bg-red-900 hover:bg-red-800 text-white py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              ✨ Processar com IA
            </button>
          </div>
        )}

        <div className="flex gap-6 justify-center mt-3">
          <p className="text-xs text-gray-400">⚡ Local — instantâneo, sem internet</p>
          <p className="text-xs text-gray-400">✨ IA — mais preciso, requer API</p>
        </div>
      </div>
      </main>
    </div>
  );
}
