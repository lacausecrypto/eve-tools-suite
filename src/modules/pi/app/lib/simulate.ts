/**
 * Simulation mono-planète : extraction (avec decay) → usines P1 → rentabilité.
 *
 * Débits standard EVE :
 * - Basic Industry Facility (P1) : 3000 P0 → 20 P1 / 30 min
 *   ⇒ consomme 6000 P0/h, produit 40 P1/h.
 * - Advanced Industry Facility (P2) : 40+40 P1 → 5 P2 / 60 min (jalon M2).
 *
 * v1 : on simule le chemin **extraction → P1** (le plus fondamental), avec choix
 * de vendre la matière brute (P0) ou la P1, taxe POCO, coût de setup et ROI.
 */
import { summarizeProgram, type ProgramSummary } from "./extractor";

/** Débit d'une usine P1 (Basic Industry Facility). */
export const P1_INPUT_PER_HOUR = 6000; // P0 consommés / h
export const P1_OUTPUT_PER_HOUR = 40; // P1 produits / h

export type OutputChoice = "raw" | "p1";

export interface SimInput {
  /** Valeur de base par cycle d'une tête d'extracteur (lue in-game). */
  qtyPerCycle: number;
  cycleSec: number;
  totalCycles: number;
  heads: number;
  /** Nombre d'usines P1 (Basic Industry Facility). */
  p1Factories: number;
  /** Marchandise vendue (brute P0 ou P1 transformée). */
  output: OutputChoice;
  /** Prix de vente unitaire (ISK) de la marchandise vendue. */
  price: number;
  /** Taxe POCO à l'export (%). */
  pocoTaxPct: number;
  /** Coût de mise en place du setup (ISK) — pour le ROI. */
  setupCostIsk: number;
}

export interface SimResult {
  program: ProgramSummary;
  /** P0 extraits / h (moyenne programme, toutes têtes). */
  extractionPerHour: number;
  /** P0 demandés / h par les usines P1 configurées. */
  factoryDemandPerHour: number;
  /** Usines P1 réellement alimentables en continu (peut être fractionnaire). */
  sustainableFactories: number;
  /** Taux d'utilisation des usines (0..1). */
  utilization: number;
  /** Surplus (>0) ou déficit (<0) de P0/h vs la demande des usines. */
  rawBalancePerHour: number;
  /** Débit de la marchandise vendue (unités/h). */
  outputPerHour: number;
  /** ISK brut / h (avant taxe). */
  grossIskPerHour: number;
  /** ISK net / h (après taxe POCO). */
  netIskPerHour: number;
  /** Heures avant amortissement du setup (ROI). */
  roiHours: number;
}

export function simulate(i: SimInput): SimResult {
  const program = summarizeProgram(
    i.qtyPerCycle,
    i.cycleSec,
    i.totalCycles,
    i.heads,
  );
  const extractionPerHour = program.unitsPerHour;

  const factoryDemandPerHour = i.p1Factories * P1_INPUT_PER_HOUR;
  const sustainableFactories = extractionPerHour / P1_INPUT_PER_HOUR;
  const rawBalancePerHour = extractionPerHour - factoryDemandPerHour;

  // Usines effectivement alimentées (bornées par l'extraction).
  const fedFactories = Math.min(i.p1Factories, sustainableFactories);
  const utilization = i.p1Factories > 0 ? fedFactories / i.p1Factories : 0;

  let outputPerHour: number;
  if (i.output === "p1") {
    outputPerHour = fedFactories * P1_OUTPUT_PER_HOUR;
  } else {
    // Vente de la matière brute : tout ce qui n'est pas consommé par les usines.
    outputPerHour = Math.max(0, rawBalancePerHour);
    // Sans usine, on vend toute l'extraction.
    if (i.p1Factories === 0) outputPerHour = extractionPerHour;
  }

  const grossIskPerHour = outputPerHour * Math.max(0, i.price);
  const netIskPerHour = grossIskPerHour * (1 - clampPct(i.pocoTaxPct) / 100);
  const roiHours =
    netIskPerHour > 0 ? i.setupCostIsk / netIskPerHour : Infinity;

  return {
    program,
    extractionPerHour,
    factoryDemandPerHour,
    sustainableFactories,
    utilization,
    rawBalancePerHour,
    outputPerHour,
    grossIskPerHour,
    netIskPerHour,
    roiHours,
  };
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

/** Nombre d'usines P1 équilibrant exactement l'extraction (sans gaspillage). */
export function balancedFactories(extractionPerHour: number): number {
  return Math.floor(extractionPerHour / P1_INPUT_PER_HOUR);
}
