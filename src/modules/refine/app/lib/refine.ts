/**
 * Moteur de **reprocessing** — **pur**. Rendement EVE exact (compétences,
 * structure, implant) puis matériaux récupérés (plancher par matériau, lots
 * entiers), avec valorisation brut vs raffiné.
 */
import type { Ore } from "../data/ore";

/** Niveaux de compétences & implant influant le rendement. */
export interface Skills {
  /** Reprocessing (+3 %/niveau). */
  reprocessing: number;
  /** Reprocessing Efficiency (+2 %/niveau). */
  efficiency: number;
  /** Compétence de traitement du minerai/glace (+2 %/niveau). */
  oreProcessing: number;
  /** Bonus d'implant en % (RX-801 = 1, RX-802 = 2, RX-804 = 4). */
  implantPct: number;
}

/**
 * Rendement effectif (0..~0.78). Formule EVE : taux de base × bonus multiplicatifs.
 *   base × (1+0.03·Reproc) × (1+0.02·Eff) × (1+0.02·Minerai) × (1+implant)
 */
export function effectiveRate(baseRatePct: number, s: Skills): number {
  return (
    (baseRatePct / 100) *
    (1 + 0.03 * s.reprocessing) *
    (1 + 0.02 * s.efficiency) *
    (1 + 0.02 * s.oreProcessing) *
    (1 + s.implantPct / 100)
  );
}

/** Un lot de minerai à raffiner. */
export interface RefineItem {
  ore: Ore;
  qty: number;
}

/** Matériaux récupérés en raffinant `qty` unités d'un minerai (lots entiers). */
export function reprocess(ore: Ore, qty: number, rate: number): Map<number, number> {
  const out = new Map<number, number>();
  const portions = Math.floor(qty / ore.portion);
  if (portions <= 0) return out;
  for (const m of ore.mats) out.set(m.m, Math.floor(m.q * portions * rate));
  return out;
}

/** Agrège les matériaux récupérés sur plusieurs lots. */
export function reprocessAll(items: RefineItem[], rate: number): Map<number, number> {
  const total = new Map<number, number>();
  for (const it of items) {
    for (const [mid, q] of reprocess(it.ore, it.qty, rate)) {
      total.set(mid, (total.get(mid) ?? 0) + q);
    }
  }
  return total;
}

/** Valeur d'un panier de matériaux selon un prix unitaire (id → prix). */
export function materialsValue(mats: Map<number, number>, price: (id: number) => number): number {
  let v = 0;
  for (const [mid, q] of mats) v += q * price(mid);
  return v;
}

/** Volume total (m³) d'un panier de minerai. */
export function totalVolume(items: RefineItem[]): number {
  return items.reduce((s, it) => s + it.qty * it.ore.volume, 0);
}
