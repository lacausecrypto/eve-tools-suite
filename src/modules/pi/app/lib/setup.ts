/**
 * Modèle de **setup PI** sauvegardable et ses indicateurs.
 *
 * Un setup capture une configuration d'extraction mono-planète (mode Extraction)
 * — l'unité comparable du portefeuille : il produit un net ISK/h, un ROI et une
 * **charge de gestion** (fréquence de reprogrammation des extracteurs).
 */
import { cyclesForDuration } from "./extractor";
import { simulate, type OutputChoice } from "./simulate";
import type { PlanetType } from "../data/commodities";

export interface ExtractionConfig {
  planet: PlanetType;
  rawId: string;
  heads: number;
  cycleSec: number;
  durationHours: number;
  qtyPerCycle: number;
  p1Factories: number;
  output: OutputChoice;
  price: number;
  pocoTaxPct: number;
  setupCostIsk: number;
}

/** Un setup nommé et attribué (à un perso/alt), persisté. */
export interface PiSetup extends ExtractionConfig {
  id: string;
  name: string;
  /** Propriétaire / alt (texte libre) — "" = par défaut. */
  owner: string;
  createdAt: number;
  /** Dernier (re)démarrage du programme d'extraction (ms epoch) — planning. */
  startedAt: number;
}

/** Échéance du programme d'extraction (ms epoch) = démarrage + durée. */
export function nextExpiry(s: PiSetup): number {
  const start = s.startedAt || s.createdAt || 0;
  return start + (s.durationHours || 0) * 3_600_000;
}

export interface SetupKpis {
  netIskPerHour: number;
  roiHours: number;
  outputPerHour: number;
  extractionPerHour: number;
  /** Fréquence de reprogrammation des extracteurs (heures) = durée de programme. */
  reprogramHours: number;
}

/** Calcule les indicateurs d'un setup (réutilise le moteur de simulation). */
export function kpisForSetup(c: ExtractionConfig): SetupKpis {
  const totalCycles = cyclesForDuration(c.cycleSec, c.durationHours || 1);
  const r = simulate({
    qtyPerCycle: c.qtyPerCycle || 0,
    cycleSec: c.cycleSec,
    totalCycles,
    heads: c.heads,
    p1Factories: c.p1Factories,
    output: c.output,
    price: c.price || 0,
    pocoTaxPct: c.pocoTaxPct || 0,
    setupCostIsk: c.setupCostIsk || 0,
  });
  return {
    netIskPerHour: r.netIskPerHour,
    roiHours: r.roiHours,
    outputPerHour: r.outputPerHour,
    extractionPerHour: r.extractionPerHour,
    reprogramHours: c.durationHours || 0,
  };
}
