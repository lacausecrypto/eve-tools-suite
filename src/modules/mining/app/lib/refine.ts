/**
 * Rendement de retraitement EVE (ore), formule officielle avec tous les
 * modificateurs multiplicatifs.
 *
 * Station NPC :
 *   y = base × (1+0.03·R) × (1+0.02·RE) × (1+0.02·OP) × (1+Im)
 *
 * Structure Upwell :
 *   y = (50+Rm)/100 × (1+Sec) × (1+Sm) × (1+0.03·R) × (1+0.02·RE) × (1+0.02·OP) × (1+Im)
 *
 * R  = Reprocessing (3 %/niv)        RE = Reprocessing Efficiency (2 %/niv)
 * OP = Traitement du minerai (2 %/niv, par minerai — approximé ici uniforme)
 * Im = implant Zainou Beancounter RX-80x (0/1/2/4 %)
 * Rm = rig de retraitement (T1 +1, T2 +3)   Sm = type (Athanor 0.02, Tatara 0.055)
 * Sec = sécurité système (HS 0, LS 0.06, NS/WH 0.12)
 *
 * Réf. EVE University — vérifié : Tatara T2 / null / skills max / RX-804 = 90,6 %.
 */
export type RefineMode = "station" | "structure";
export type StructureType = "citadel" | "athanor" | "tatara";
export type RefineRig = "none" | "t1" | "t2";
export type RefineSecurity = "high" | "low" | "null";

export interface RefineConfig {
  mode: RefineMode;
  reprocessing: number; // 0..5
  efficiency: number; // 0..5 (Reprocessing Efficiency)
  oreProcessing: number; // 0..5 (skill spécifique au minerai)
  implant: 0 | 1 | 2 | 4; // %
  stationBase: number; // 30..50 (station NPC)
  structureType: StructureType;
  rig: RefineRig;
  security: RefineSecurity;
}

export const DEFAULT_REFINE_CONFIG: RefineConfig = {
  mode: "station",
  reprocessing: 5,
  efficiency: 5,
  oreProcessing: 4,
  implant: 0,
  stationBase: 50,
  structureType: "athanor",
  rig: "t1",
  security: "high",
};

const STRUCTURE_SM: Record<StructureType, number> = {
  citadel: 0,
  athanor: 0.02,
  tatara: 0.055,
};
const RIG_RM: Record<RefineRig, number> = { none: 0, t1: 1, t2: 3 };
const SEC_FACTOR: Record<RefineSecurity, number> = {
  high: 0,
  low: 0.06,
  null: 0.12,
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** Rendement effectif en fraction (0..1), plafonné à 1 (100 %). */
export function computeRefineYield(c: RefineConfig): number {
  const r = clamp(c.reprocessing, 0, 5);
  const re = clamp(c.efficiency, 0, 5);
  const op = clamp(c.oreProcessing, 0, 5);
  const skills =
    (1 + 0.03 * r) * (1 + 0.02 * re) * (1 + 0.02 * op) * (1 + c.implant / 100);

  let base: number;
  if (c.mode === "structure") {
    const rm = RIG_RM[c.rig];
    const sm = STRUCTURE_SM[c.structureType];
    const sec = SEC_FACTOR[c.security];
    base = ((50 + rm) / 100) * (1 + sec) * (1 + sm);
  } else {
    base = clamp(c.stationBase, 0, 100) / 100;
  }
  return Math.min(1, base * skills);
}

/** Rendement en pourcentage arrondi à 0,1 %. */
export function refineYieldPct(c: RefineConfig): number {
  return Math.round(computeRefineYield(c) * 1000) / 10;
}
