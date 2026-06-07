/** Parsing d'un collage de minerai (inventaire / multibuy) — **pur**. */

export interface ParsedOre {
  name: string;
  qty: number;
}

function toQty(s: string): number {
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseOre(text: string): ParsedOre[] {
  const agg = new Map<string, ParsedOre>();
  const push = (name: string, qty: number) => {
    const key = name.toLowerCase();
    const cur = agg.get(key);
    if (cur) cur.qty += qty;
    else agg.set(key, { name, qty });
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes("\t")) {
      const cols = line.split("\t");
      const name = cols[0].trim();
      if (!name) continue;
      const qc = (cols[1] ?? "").trim();
      push(name, /^[\d][\d.,\s]*$/.test(qc) ? toQty(qc) : 1);
      continue;
    }
    const m = line.match(/^(.*?)\s+(?:x\s*)?([\d][\d.,\s]*)$/i);
    if (m && /\d/.test(m[2])) push(m[1].trim(), toQty(m[2]));
    else push(line, 1);
  }
  return [...agg.values()];
}
