import { NextRequest } from "next/server";
import OpenAI from "openai";

export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Pré-processamento: extrai linhas relevantes e expande emendas em grupo ────

function buildStructuredText(rawText: string): string {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Cabeçalho da sessão
    if (
      /^ORDEM DO DIA/i.test(line) ||
      /^\d+[ªa]\s+REUNI[AÃ]O/i.test(line) ||
      /^SESS[AÃ]O LEGISLATIVA/i.test(line) ||
      /^LEGISLATURA/i.test(line)
    ) {
      result.push(line);
      continue;
    }

    // DISCUSSÃO ÚNICA (Requerimentos, audiências, sessões solenes)
    if (/^DISCUSS[AÃ]O [ÚU]NICA/i.test(line)) {
      result.push(line);
      // Inclui destaque/sugestão das linhas seguintes
      let j = i + 1;
      while (
        j < lines.length &&
        /^\*(Destaque|Sugest[aã]o|CASO|Guilherme|JUSTIFICATIVA)/i.test(lines[j])
      ) {
        result.push(lines[j]);
        j++;
      }
      continue;
    }

    // 1ª/2ª DISCUSSÃO — Projetos de Lei
    if (/^[12][ªa]\s+DISCUSS[AÃ]O/i.test(line)) {
      result.push(line);
      continue;
    }

    // VOTAÇÃO ÚNICA
    if (/^VOTA[CÇ][AÃ]O [ÚU]NICA/i.test(line)) {
      result.push(line);
      continue;
    }

    // Emenda individual explícita: "EMENDA N° 8, DE AUTORIA DA..."
    if (/^EMENDA\s+N[°º]?\s*\d+/i.test(line)) {
      result.push(line);
      continue;
    }

    // Emendas em bloco — mantém como item único (votação conjunta)
    // "EMENDAS: 275 E 276, AMBAS DO CHEFE DO PODER EXECUTIVO;"
    // "EMENDAS: 9, 10, 11... DE AUTORIA DA VER. LIANA CIRNE;"
    if (/^EMENDAS?:\s/i.test(line)) {
      result.push(line); // preserva linha original intacta
      continue;
    }
  }

  return result.join("\n");
}

// ── Extrai texto completo do documento original por número do item ─────────────

interface ParsedItem {
  itemType: string;
  itemNumber: string;
  author: string;
  phase?: string;
  destaque?: string;
  docSuggestion?: string;
  fullText?: string;
}

function enrichWithFullTexts(rawText: string, items: ParsedItem[]): ParsedItem[] {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const n = lines.length;
  const NEXT_ITEM =
    /^(DISCUSS[AÃ]O [ÚU]NICA|[12][ªa]\s+DISCUSS[AÃ]O|VOTA[CÇ][AÃ]O [ÚU]NICA|EMENDAS?[:\s]|EMENDA\s+N)/i;
  const SEPARATOR = /^\*{3,}/;

  return items.map((item) => {
    if (!item.itemNumber) return item;

    let startIdx = -1;

    // Emendas em bloco: itemNumber = "151, 156, 159, ..."
    // Localiza pelo primeiro número na linha EMENDAS: ...
    const isMulti = /,/.test(item.itemNumber) && item.itemType === "EMENDA";
    if (isMulti) {
      const firstNum = item.itemNumber.split(",")[0].trim();
      startIdx = lines.findIndex(
        (l) => /^EMENDAS?:/i.test(l) && l.includes(firstNum)
      );
    } else {
      const escaped = item.itemNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      startIdx = lines.findIndex((l) => new RegExp(escaped).test(l));
    }

    if (startIdx === -1) return item;

    let endIdx = startIdx + 1;
    while (endIdx < n) {
      if (NEXT_ITEM.test(lines[endIdx]) || SEPARATOR.test(lines[endIdx])) break;
      endIdx++;
    }
    return { ...item, fullText: lines.slice(startIdx, endIdx).join("\n") };
  });
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um parser especializado em pautas de votação da Câmara Municipal do Recife.

O texto já está pré-processado. Extraia TODOS os itens de votação e retorne JSON:
{
  "sessionTitle": "ex: 15ª Reunião Ordinária — 31/03/2026",
  "items": [
    {
      "itemType": "REQUERIMENTO" | "PLE" | "EMENDA" | "PDL" | "OUTRO",
      "itemNumber": "ex: 1843/2026 | 275 | 151, 156, 159, 162",
      "author": "nome do(a) vereador(a) ou Poder Executivo",
      "phase": "ex: Discussão Única | 1ª Discussão | Rejeitada | Aprovada",
      "destaque": "texto do destaque (null se não houver)",
      "docSuggestion": "sugestão de voto do doc (null se não houver)"
    }
  ]
}

Regras CRÍTICAS:
1. "EMENDAS: 151, 156, 159, ..." = UM ÚNICO ITEM de votação conjunta. itemNumber = todos os números separados por vírgula (ex: "151, 156, 159")
2. "EMENDA Nº X" (singular, com número único) = item individual
3. Emendas rejeitadas: phase "Rejeitada" | Aprovadas: phase "Aprovada"
4. DISCUSSÃO ÚNICA = REQUERIMENTO (solicitações, homenagens, audiências)
5. 1ª/2ª DISCUSSÃO = PLE (Projeto de Lei)
6. Retorne SOMENTE o JSON, sem markdown`;

// ── Rota — usa streaming para resposta imediata (como chat) ───────────────────

const enc = new TextEncoder();
function sseChunk(data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  let text = "";

  try {
    const body = await req.json();
    text = body.text ?? "";
  } catch {
    return new Response(
      `data: ${JSON.stringify({ error: "Requisição inválida" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  if (!text || text.trim().length < 50) {
    return new Response(
      `data: ${JSON.stringify({ error: "Texto muito curto ou vazio" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const structured = buildStructuredText(text);
  const input = (structured.length > 200 ? structured : text).slice(0, 40000);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Avisa o cliente que começou
        controller.enqueue(sseChunk({ status: "Analisando a pauta com IA..." }));

        const aiStream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 8000,
          stream: true, // ← streaming como no chat
        });

        let fullText = "";
        let lastProgressAt = 0;

        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          fullText += delta;

          // Envia progresso a cada 200 chars (feedback contínuo)
          if (fullText.length - lastProgressAt > 200) {
            lastProgressAt = fullText.length;
            // Estima itens encontrados contando "itemType" no JSON parcial
            const itemCount = (fullText.match(/"itemType"/g) ?? []).length;
            controller.enqueue(
              sseChunk({ status: `Processando... ${itemCount} itens encontrados` })
            );
          }
        }

        // Parse e enriquece com textos completos
        const parsed = JSON.parse(fullText);
        const enriched = enrichWithFullTexts(text, parsed.items ?? []);

        // Resultado final
        controller.enqueue(
          sseChunk({
            done: true,
            sessionTitle: parsed.sessionTitle ?? "",
            items: enriched,
          })
        );
      } catch (err) {
        console.error("Parse stream error:", err);
        controller.enqueue(
          sseChunk({ error: err instanceof Error ? err.message : "Erro desconhecido" })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
