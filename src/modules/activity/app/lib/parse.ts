/**
 * Parsing d'un collage de butin/inventaire EVE — **pur**. Gère :
 * - le copier d'inventaire (séparé par tabulations : `Nom\tQté\t…`),
 * - le format multibuy (`Nom  Qté` ou `Nom xQté`),
 * - une simple liste de noms (quantité 1).
 */

export interface ParsedLine {
  name: string;
  qty: number;
}

function toQty(s: string): number {
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseLoot(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Inventaire : séparé par tabulations, la 2e colonne est la quantité.
    if (line.includes("\t")) {
      const cols = line.split("\t");
      const name = cols[0].trim();
      if (!name) continue;
      const qtyCol = (cols[1] ?? "").trim();
      out.push({ name, qty: /\d/.test(qtyCol) ? toQty(qtyCol) : 1 });
      continue;
    }

    // Multibuy : « Nom xQté » ou « Nom Qté » en fin de ligne.
    const m = line.match(/^(.*?)\s+x?([\d.,\s]+)$/);
    if (m && /\d/.test(m[2])) {
      out.push({ name: m[1].trim(), qty: toQty(m[2]) });
      continue;
    }

    out.push({ name: line, qty: 1 });
  }
  return out;
}
