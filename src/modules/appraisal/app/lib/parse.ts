/**
 * Parseur **multi-format** d'un collage d'items EVE — **pur**. Gère :
 * - copier d'inventaire / scan de cargo / contrat (séparé par tabulations),
 * - multibuy (`Nom  Qté`, `Nom xQté`, `Nom\tQté`),
 * - liste simple de noms (quantité 1).
 * Les quantités peuvent contenir des séparateurs de milliers (`1 234`, `1,234`).
 */

export interface ParsedLine {
  name: string;
  qty: number;
}

/** Convertit un champ quantité (séparateurs tolérés) en entier ≥ 1. */
function toQty(s: string): number {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 1;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Est-ce un champ purement numérique (quantité) ? */
function isQtyField(s: string): boolean {
  return /^[\d][\d.,\s]*$/.test(s.trim());
}

const TRAILING_QTY = /^(.*?)\s+(?:x\s*)?([\d][\d.,\s]*)$/i;

/** Parse un texte collé en lignes `{ name, qty }`, agrégées par nom. */
export function parseItems(text: string): ParsedLine[] {
  const agg = new Map<string, ParsedLine>();
  const push = (name: string, qty: number) => {
    const key = name.toLowerCase();
    const cur = agg.get(key);
    if (cur) cur.qty += qty;
    else agg.set(key, { name, qty });
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // Tabulations : inventaire / cargo / contrat. Colonne 0 = nom, 1 = quantité.
    if (line.includes("\t")) {
      const cols = line.split("\t");
      const name = cols[0].trim();
      if (!name) continue;
      const qtyCol = (cols[1] ?? "").trim();
      push(name, isQtyField(qtyCol) ? toQty(qtyCol) : 1);
      continue;
    }

    // Multibuy : « Nom xQté » ou « Nom Qté » en fin de ligne.
    const m = line.match(TRAILING_QTY);
    if (m && /\d/.test(m[2])) {
      push(m[1].trim(), toQty(m[2]));
      continue;
    }

    // Nom seul.
    push(line, 1);
  }

  return [...agg.values()];
}

/** Noms distincts à résoudre. */
export function distinctNames(lines: ParsedLine[]): string[] {
  return [...new Set(lines.map((l) => l.name))];
}
