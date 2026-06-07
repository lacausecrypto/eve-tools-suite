/**
 * Parseur de listes collées — **pur, sans dépendance** (vérifiable hors React).
 *
 * Accepte les formats EVE courants, ligne par ligne :
 *  - inventaire copié : `Nom<TAB>Quantité<TAB>Groupe…`
 *  - multibuy / liste : `Nom  1000` ou `Nom 1 000` ou `Nom` (→ 1)
 *
 * Les quantités tolèrent les séparateurs de milliers (`1,000` / `1.000` / `1 000`).
 * Les doublons (même nom) sont fusionnés en sommant les quantités.
 */

export interface ParsedLine {
  name: string;
  qty: number;
}

/** Convertit un libellé de quantité en entier (>0) ou `null`. */
function parseQty(s: string): number | null {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseLine(line: string): ParsedLine | null {
  // Tabulé (inventaire ou multibuy) : 1ʳᵉ colonne = nom, 1ʳᵉ colonne numérique = qté.
  if (line.includes("\t")) {
    const cols = line.split("\t").map((c) => c.trim());
    const name = cols[0];
    if (!name) return null;
    let qty = 1;
    for (let i = 1; i < cols.length; i++) {
      const n = parseQty(cols[i]);
      if (n != null) {
        qty = n;
        break;
      }
    }
    return { name, qty };
  }

  // Espaces : « Nom … <quantité> » se terminant par un nombre.
  const m = line.match(/^(.*?)\s+x?(\d[\d.,\s]*)$/i);
  if (m) {
    const qty = parseQty(m[2]);
    const name = m[1].trim();
    if (qty != null && name) return { name, qty };
  }

  // Sinon : nom seul → quantité 1.
  return { name: line, qty: 1 };
}

/** Parse un blob multi-lignes en liste `{ name, qty }`, doublons fusionnés. */
export function parseQtyList(text: string): ParsedLine[] {
  const merged = new Map<string, ParsedLine>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    const existing = merged.get(key);
    if (existing) existing.qty += parsed.qty;
    else merged.set(key, { ...parsed });
  }
  return [...merged.values()];
}
