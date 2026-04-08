/**
 * Parser local (offline) para pautas da Câmara Municipal do Recife.
 * Não depende de OpenAI — usa regex baseado na estrutura oficial das Ordens do Dia.
 *
 * Tipos reconhecidos:
 *  - DISCUSSÃO ÚNICA           → REQUERIMENTO (requerimentos, audiências, sessões solenes)
 *  - 1ª/2ª DISCUSSÃO           → PLE (Projetos de Lei)
 *  - VOTAÇÃO ÚNICA             → REQUERIMENTO ou PLE conforme contexto
 *  - EMENDA Nº X               → EMENDA individual
 *  - EMENDAS: X, Y, Z          → EMENDA em bloco (um único item de votação conjunta)
 *  - PDL / PROJETO DE DECRETO  → PDL
 */

export interface ParsedItem {
  itemType: "REQUERIMENTO" | "PLE" | "EMENDA" | "PDL" | "OUTRO";
  itemNumber: string;
  author: string;
  phase: string;
  destaque?: string;
  docSuggestion?: string;
  fullText: string;
}

export interface ParseResult {
  sessionTitle: string;
  items: ParsedItem[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractAuthor(line: string): string {
  // "DE AUTORIA DA VER. FULANA DE TAL" ou "DE AUTORIA DO CHEFE DO PODER EXECUTIVO"
  const m = line.match(
    /DE AUTORIA D[AO]\s+(?:VER(?:EADORA?)?\.\s*|VER\.\s*)?(.+?)(?:\s*[;,.]|$)/i
  );
  if (m) return m[1].trim();

  // Fallback: "AUTORIA: FULANA"
  const m2 = line.match(/AUTORIA:\s*(.+?)(?:\s*[;,.]|$)/i);
  if (m2) return m2[1].trim();

  return "";
}

function extractNumber(line: string): string {
  // "REQUERIMENTO Nº 1843/2026" → "1843/2026"
  const m = line.match(/N[°Oº]?\s*(\d+(?:\/\d+)?)/i);
  return m ? m[1] : "";
}

function extractDestaque(line: string): string {
  const m = line.match(/^\*?\s*(?:Destaque|DESTAQUE)\s*\d*:?\s*(.+)/i);
  return m ? m[1].trim() : "";
}

function extractDocSuggestion(line: string): string {
  const m = line.match(
    /^\*?\s*(?:Sugest[aã]o|SUGESTÃO|CASO|JUSTIFICATIVA):?\s*(.+)/i
  );
  return m ? m[1].trim() : "";
}

// ── main parser ───────────────────────────────────────────────────────────────

export function parseLocalAgenda(rawText: string): ParseResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ── 1. Extrai título da sessão ────────────────────────────────────────────
  let sessionTitle = "Ordem do Dia";
  for (const line of lines) {
    if (
      /^\d+[ªa]\s+REUNI[AÃ]O/i.test(line) ||
      /^SESS[AÃ]O\s+LEGISLATIVA/i.test(line)
    ) {
      sessionTitle = line;
      break;
    }
    if (/^ORDEM DO DIA/i.test(line)) {
      sessionTitle = line;
      // Não break — pode ter linha melhor depois
    }
  }

  // ── 2. Primeira passagem: identifica blocos de item ───────────────────────
  const ITEM_START =
    /^(DISCUSS[AÃ]O [ÚU]NICA|[12][ªa]\s+DISCUSS[AÃ]O|VOTA[CÇ][AÃ]O [ÚU]NICA|EMENDAS?:|EMENDA\s+N[°Oº]?|PROJETO DE LEI|PDL|SUBEMENDA)/i;

  // Índices onde começam itens
  const itemStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (ITEM_START.test(lines[i])) itemStarts.push(i);
  }

  // ── 3. Extrai texto completo de cada bloco ────────────────────────────────
  const blocks: string[][] = itemStarts.map((start, bi) => {
    const end = itemStarts[bi + 1] ?? lines.length;
    return lines.slice(start, end);
  });

  // ── 4. Converte blocos em ParsedItem[] ────────────────────────────────────
  const items: ParsedItem[] = [];

  for (const block of blocks) {
    const firstLine = block[0];

    // Destaque e sugestão ficam nas linhas seguintes (começam com "*")
    const destaqueLines: string[] = [];
    const suggestionLines: string[] = [];
    for (let i = 1; i < block.length; i++) {
      const l = block[i];
      if (/^\*?\s*(Destaque|DESTAQUE)/i.test(l)) {
        destaqueLines.push(extractDestaque(l) || l.replace(/^\*/, "").trim());
      } else if (/^\*?\s*(Sugest[aã]o|Caso|Justificativa)/i.test(l)) {
        suggestionLines.push(
          extractDocSuggestion(l) || l.replace(/^\*/, "").trim()
        );
      }
    }
    const destaque = destaqueLines.join(" ") || undefined;
    const docSuggestion = suggestionLines.join(" ") || undefined;
    const fullText = block.join("\n");

    // ── EMENDAS em bloco: "EMENDAS: 275, 276, AMBAS DO..." ─────────────────
    // Votação conjunta — um único item com todos os números
    if (/^EMENDAS?:\s/i.test(firstLine)) {
      const authorMatch = firstLine.match(
        /DE AUTORIA D[AO]\s+(?:VER(?:EADORA?)?\.\s*)?(.+?)(?:;|\.|$)/i
      );
      const author = authorMatch ? authorMatch[1].trim() : extractAuthor(firstLine);
      const nums = (firstLine.match(/\b\d+\b/g) ?? []).join(", ");
      items.push({
        itemType: "EMENDA",
        itemNumber: nums, // ex: "275, 276" ou "272, 273, 274"
        author,
        phase: "Votação",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── EMENDA individual ───────────────────────────────────────────────────
    if (/^EMENDA\s+N[°Oº]?\s*\d+/i.test(firstLine)) {
      items.push({
        itemType: "EMENDA",
        itemNumber: extractNumber(firstLine),
        author: extractAuthor(firstLine),
        phase: /rejeitad/i.test(fullText)
          ? "Rejeitada"
          : /aprovad/i.test(fullText)
          ? "Aprovada"
          : "Votação",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── DISCUSSÃO ÚNICA → REQUERIMENTO ──────────────────────────────────────
    if (/^DISCUSS[AÃ]O [ÚU]NICA/i.test(firstLine)) {
      // Número pode ser "Nº 1843/2026" ou "REQ Nº 01/2026"
      const numMatch = firstLine.match(
        /(?:N[°Oº]?\s*)(\d+(?:\/\d+)?)/i
      );
      items.push({
        itemType: "REQUERIMENTO",
        itemNumber: numMatch ? numMatch[1] : extractNumber(firstLine),
        author: extractAuthor(firstLine),
        phase: "Discussão Única",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── VOTAÇÃO ÚNICA ────────────────────────────────────────────────────────
    if (/^VOTA[CÇ][AÃ]O [ÚU]NICA/i.test(firstLine)) {
      const isPLE = /PLE|PROJETO DE LEI/i.test(firstLine);
      items.push({
        itemType: isPLE ? "PLE" : "REQUERIMENTO",
        itemNumber: extractNumber(firstLine),
        author: extractAuthor(firstLine),
        phase: "Votação Única",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── 1ª ou 2ª DISCUSSÃO → PLE ─────────────────────────────────────────────
    if (/^[12][ªa]\s+DISCUSS[AÃ]O/i.test(firstLine)) {
      const phaseMatch = firstLine.match(/^([12][ªa]\s+DISCUSS[AÃ]O)/i);
      items.push({
        itemType: "PLE",
        itemNumber: extractNumber(firstLine),
        author: extractAuthor(firstLine),
        phase: phaseMatch ? phaseMatch[1] : "Discussão",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── PDL / Projeto de Decreto Legislativo ─────────────────────────────────
    if (/^PDL|PROJETO DE DECRETO LEGISLATIVO/i.test(firstLine)) {
      items.push({
        itemType: "PDL",
        itemNumber: extractNumber(firstLine),
        author: extractAuthor(firstLine),
        phase: "Votação",
        destaque,
        docSuggestion,
        fullText,
      });
      continue;
    }

    // ── Fallback: OUTRO ───────────────────────────────────────────────────────
    items.push({
      itemType: "OUTRO",
      itemNumber: extractNumber(firstLine),
      author: extractAuthor(firstLine),
      phase: "",
      destaque,
      docSuggestion,
      fullText,
    });
  }

  return { sessionTitle, items };
}
