import type { StockItem } from "@mining/types";

/**
 * Parse le copier-coller d'un inventaire EVE (consommables de minage).
 *
 * Format EVE (séparé par tabulations) :
 *   Mining Laser Efficiency Charge\t9700\tMining Laser Charge\t...
 * Tolère aussi un simple « Nom <espaces> Quantité » sans tabulation, et les
 * séparateurs de milliers (espaces, points, virgules). Les lignes d'en-tête et
 * non reconnues sont ignorées.
 */
export interface StockParseResult {
  items: StockItem[];
  matchedLines: number;
  totalLines: number;
}

function parseQty(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Quantité en fin de chaîne sans tabulation (ex : "Heavy Water  9 800"). */
const TRAILING_QTY_RE = /^(.+?)[\s ]+([\d.,\s ]+)$/;

export function parseStock(text: string): StockParseResult {
  const lines = text.split(/\r?\n/);
  const items: StockItem[] = [];
  const seen = new Map<string, number>(); // nom (minuscule) -> index dans items
  let totalLines = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    totalLines++;

    let name = "";
    let qty = 0;

    if (line.includes("\t")) {
      // Format inventaire EVE : Nom \t Quantité \t Groupe \t …
      const parts = line.split("\t").map((p) => p.trim());
      name = parts[0];
      qty = parseQty(parts[1] ?? "");
    } else {
      const m = line.match(TRAILING_QTY_RE);
      if (m) {
        name = m[1].trim();
        qty = parseQty(m[2]);
      }
    }

    if (!name || qty <= 0) continue;
    if (/^(name|nom)$/i.test(name)) continue; // ligne d'en-tête

    const key = name.toLowerCase();
    if (seen.has(key)) {
      items[seen.get(key)!].qty += qty; // même objet répété → cumul
    } else {
      seen.set(key, items.length);
      items.push({ name, qty });
    }
  }

  return { items, matchedLines: items.length, totalLines };
}
