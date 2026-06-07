/**
 * Parseur **EFT** (le format texte standard d'export de fit EVE). Pur, sans
 * réseau : il ne fait que séparer la vaisseau, les modules (+ charge éventuelle),
 * les drones et la cargaison. Le slot réel de chaque module est déduit plus tard
 * via les effets dogma (`analyze.ts`).
 *
 * Format :
 *   [Vaisseau, Nom du fit]
 *   Module bas
 *
 *   Module moyen, Munition          ← module + charge séparés par ", "
 *   ...
 *   Drone II x5                     ← quantité en suffixe " xN"
 */

export interface EftLine {
  name: string;
  qty: number;
  /** Charge/munition chargée dans le module, si présente. */
  charge?: string;
}

export interface ParsedFit {
  shipName: string;
  fitName: string;
  lines: EftLine[];
}

const HEADER = /^\[(.+?),\s*(.*)\]$/;
const QTY = /^(.*?)\s+x(\d+)$/i;

/** Parse un texte EFT. Renvoie `null` si l'en-tête `[Vaisseau, Nom]` est absent. */
export function parseEft(text: string): ParsedFit | null {
  const raw = text.split(/\r?\n/);
  let header: RegExpMatchArray | null = null;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i].trim().match(HEADER);
    if (m) {
      header = m;
      start = i + 1;
      break;
    }
  }
  if (!header) return null;

  const shipName = header[1].trim();
  const fitName = (header[2] || "Fit").trim();
  const lines: EftLine[] = [];

  for (let i = start; i < raw.length; i++) {
    let line = raw[i].trim();
    if (!line) continue;
    // Slots vides exportés par le client.
    if (/^\[empty\b/i.test(line)) continue;
    // Marqueur d'état hors-ligne EFT.
    line = line.replace(/\s*\/OFFLINE\s*$/i, "").trim();
    if (!line) continue;

    // Quantité en suffixe (drones, cargaison).
    const q = line.match(QTY);
    if (q) {
      lines.push({ name: q[1].trim(), qty: Math.max(1, parseInt(q[2], 10)) });
      continue;
    }

    // Module + charge : on coupe à la **première** virgule (les noms de
    // modules ne contiennent pas de virgule).
    const comma = line.indexOf(",");
    if (comma >= 0) {
      lines.push({
        name: line.slice(0, comma).trim(),
        qty: 1,
        charge: line.slice(comma + 1).trim() || undefined,
      });
    } else {
      lines.push({ name: line, qty: 1 });
    }
  }

  return { shipName, fitName, lines };
}

/** Noms de types distincts à résoudre (vaisseau + modules + charges + drones). */
export function typeNames(fit: ParsedFit): string[] {
  const set = new Set<string>([fit.shipName]);
  for (const l of fit.lines) {
    set.add(l.name);
    if (l.charge) set.add(l.charge);
  }
  return [...set];
}
