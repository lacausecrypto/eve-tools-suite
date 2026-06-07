/**
 * Parsing d'une liste **multibuy / fit / inventaire** EVE en {nom, quantité}.
 * Gère les formats courants :
 *  - "Tritanium\t1000" (multibuy / copie d'inventaire — colonnes tabulées)
 *  - "Tritanium 1000"   (multibuy texte)
 *  - "Hobgoblin II x5"  (fit EFT avec quantité)
 *  - "Damage Control II" (fit EFT — quantité 1)
 */
export interface BasketLine {
  name: string;
  qty: number;
}

/** Nettoie un nombre EVE ("1 000", "1,000", "1.000") en entier. */
function parseQty(raw: string): number | null {
  const cleaned = raw.replace(/[\s.,]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse une liste collée en lignes {nom, qté}, doublons fusionnés. */
export function parseMultibuy(text: string): BasketLine[] {
  const merged = new Map<string, { name: string; qty: number }>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let name = line;
    let qty = 1;

    if (line.includes("\t")) {
      // Colonnes tabulées : nom \t quantité \t [groupe…]
      const cols = line.split("\t").map((c) => c.trim());
      name = cols[0];
      const q = cols[1] != null ? parseQty(cols[1]) : null;
      if (q) qty = q;
    } else {
      // "nom xN" ou "nom N" en fin de ligne.
      const m = line.match(/^(.*?)[\s]+x?\s*([\d.,\s]+)$/i);
      if (m) {
        const q = parseQty(m[2]);
        if (q) {
          name = m[1].trim();
          qty = q;
        }
      }
    }

    name = name.replace(/\s+x$/i, "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    const ex = merged.get(key);
    if (ex) ex.qty += qty;
    else merged.set(key, { name, qty });
  }

  return [...merged.values()];
}
