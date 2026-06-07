import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import {
  DEFAULT_SCC_SURCHARGE,
  type ActivityType,
  type CostInputs,
} from "./lib/industry";

/** Statut d'un job dans le carnet. */
export type JobStatus = "planned" | "active" | "done";

/** Un matériau requis par un job (quantité réelle, tous runs confondus). */
export interface LedgerMaterial {
  typeId: number;
  name: string;
  qty: number;
}

/** Une entrée du carnet de jobs (snapshot du coût au moment de l'ajout). */
export interface LedgerEntry {
  id: string;
  createdAt: number;
  outputTypeId: number;
  outputName: string;
  runs: number;
  unitsProduced: number;
  /** Coût de revient total figé à l'enregistrement. */
  totalCost: number;
  unitCost: number;
  /** Prix de vente unitaire retenu au calcul. */
  expectedUnitSell: number;
  /** Profit net attendu au calcul. */
  expectedProfit: number;
  /** Taux de frais (taxe vente + courtage) figé, pour le profit réalisé. */
  feeRate: number;
  status: JobStatus;
  /** Matériaux requis par le job (pour la liste de courses agrégée). */
  materials?: LedgerMaterial[];
  /** Durée du job (secondes) au calcul, si connue. */
  timeSeconds?: number;
  /** Profit par heure attendu, si le temps était connu. */
  profitPerHour?: number;
  /** Prix de vente unitaire réel (quand vendu). */
  soldUnitPrice?: number;
  /** Profit réellement réalisé (quand vendu). */
  realizedProfit?: number;
  note?: string;
}

/** Données minimales pour créer une entrée (le store ajoute id/date). */
export type NewLedgerEntry = Omit<
  LedgerEntry,
  "id" | "createdAt" | "status" | "soldUnitPrice" | "realizedProfit"
>;

interface LedgerState {
  entries: LedgerEntry[];
  add: (e: NewLedgerEntry) => void;
  remove: (id: string) => void;
  setStatus: (id: string, status: JobStatus) => void;
  /** Marque un job vendu au prix unitaire `soldUnitPrice` → calcule le réalisé. */
  markSold: (id: string, soldUnitPrice: number) => void;
  setNote: (id: string, note: string) => void;
  importEntries: (incoming: LedgerEntry[]) => number;
  clear: () => void;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `j${Date.now().toString(36)}${counter}`;
}

/** Profit réalisé = vente nette − coût total figé. */
function realized(e: LedgerEntry, soldUnitPrice: number): number {
  const net = soldUnitPrice * e.unitsProduced * (1 - e.feeRate);
  return net - e.totalCost;
}

/**
 * Carnet de jobs d'industrie persisté (namespace `industry`). 100 % local :
 * snapshots de coût, statuts et profits réalisés — aucune donnée envoyée.
 */
export const useLedger = create<LedgerState>()(
  persist(
    (set) => ({
      entries: [],

      add: (e) =>
        set((s) => ({
          entries: [
            { ...e, id: newId(), createdAt: Date.now(), status: "planned" },
            ...s.entries,
          ],
        })),

      remove: (id) =>
        set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),

      setStatus: (id, status) =>
        set((s) => ({
          entries: s.entries.map((x) => (x.id === id ? { ...x, status } : x)),
        })),

      markSold: (id, soldUnitPrice) =>
        set((s) => ({
          entries: s.entries.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "done",
                  soldUnitPrice,
                  realizedProfit: realized(x, soldUnitPrice),
                }
              : x,
          ),
        })),

      setNote: (id, note) =>
        set((s) => ({
          entries: s.entries.map((x) => (x.id === id ? { ...x, note } : x)),
        })),

      importEntries: (incoming) => {
        const fresh = incoming.map((e) => ({
          ...e,
          id: newId(),
          createdAt: e.createdAt || Date.now(),
        }));
        set((s) => ({ entries: [...fresh, ...s.entries] }));
        return fresh.length;
      },

      clear: () => set({ entries: [] }),
    }),
    {
      name: "ledger",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("industry")),
    },
  ),
);

/** Agrégats du carnet (ISK en production, profits attendu/réalisé). */
export interface LedgerTotals {
  inProductionCost: number;
  expectedProfit: number;
  realizedProfit: number;
  openCount: number;
  doneCount: number;
}

// ───────────────────────── Calculateur (état éditable persisté) ─────────────

/** Matériau en cours d'édition (le type_id est résolu au calcul). */
export interface EditableMaterial {
  name: string;
  baseQty: number;
}

/** Recette éditable dans le calculateur. */
export interface EditableRecipe {
  outputName: string;
  outputPerRun: number;
  runs: number;
  me: number;
  facilityMaterialBonus: number;
  materials: EditableMaterial[];
  /** Activité (défaut fabrication). */
  activity: ActivityType;
  /** Time Efficiency 0–20 (%). */
  te: number;
  /** Temps de base par run (secondes, TE 0). 0 si inconnu. */
  baseTimePerRun: number;
  /** Réduction de temps structure/rigs/skills (fraction 0–1). */
  facilityTimeBonus: number;
}

export const DEFAULT_RECIPE: EditableRecipe = {
  outputName: "",
  outputPerRun: 1,
  runs: 1,
  me: 10,
  facilityMaterialBonus: 0,
  materials: [],
  activity: "manufacturing",
  te: 20,
  baseTimePerRun: 0,
  facilityTimeBonus: 0,
};

/** Métadonnées du calculateur (système & skills, hors recette/coût). */
export interface CalcMeta {
  systemName: string;
  accountingLevel: number;
  brokerLevel: number;
}

export const DEFAULT_META: CalcMeta = {
  systemName: "",
  accountingLevel: 0,
  brokerLevel: 0,
};

export const DEFAULT_INPUTS: CostInputs = {
  systemCostIndex: 0.05,
  facilityTax: 0.0025,
  sccSurcharge: DEFAULT_SCC_SURCHARGE,
  materialBasis: "buy",
  productBasis: "sell",
  salesTax: 0.045,
  brokerFee: 0.03,
};

interface CalcState {
  recipe: EditableRecipe;
  inputs: CostInputs;
  meta: CalcMeta;
  setRecipe: (patch: Partial<EditableRecipe>) => void;
  setMaterials: (materials: EditableMaterial[]) => void;
  setInputs: (patch: Partial<CostInputs>) => void;
  setMeta: (patch: Partial<CalcMeta>) => void;
  reset: () => void;
}

/** État du calculateur, persisté (namespace `industry`) pour survivre aux onglets. */
export const useCalc = create<CalcState>()(
  persist(
    (set) => ({
      recipe: DEFAULT_RECIPE,
      inputs: DEFAULT_INPUTS,
      meta: DEFAULT_META,
      setRecipe: (patch) => set((s) => ({ recipe: { ...s.recipe, ...patch } })),
      setMaterials: (materials) =>
        set((s) => ({ recipe: { ...s.recipe, materials } })),
      setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),
      setMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),
      reset: () => set({ recipe: DEFAULT_RECIPE, inputs: DEFAULT_INPUTS, meta: DEFAULT_META }),
    }),
    {
      name: "calc",
      version: 2,
      storage: createJSONStorage(() => namespacedStorage("industry")),
      // v1 → v2 : complète les nouveaux champs (recette temps/activité + méta).
      migrate: (state: unknown, version: number) => {
        const s = (state ?? {}) as Partial<CalcState>;
        if (version < 2) {
          return {
            ...s,
            recipe: { ...DEFAULT_RECIPE, ...(s.recipe ?? {}) },
            inputs: { ...DEFAULT_INPUTS, ...(s.inputs ?? {}) },
            meta: { ...DEFAULT_META, ...(s.meta ?? {}) },
          } as CalcState;
        }
        return s as CalcState;
      },
    },
  ),
);

export function ledgerTotals(entries: LedgerEntry[]): LedgerTotals {
  let inProductionCost = 0;
  let expectedProfit = 0;
  let realizedProfit = 0;
  let openCount = 0;
  let doneCount = 0;
  for (const e of entries) {
    if (e.status === "done") {
      realizedProfit += e.realizedProfit ?? 0;
      doneCount += 1;
    } else {
      inProductionCost += e.totalCost;
      expectedProfit += e.expectedProfit;
      openCount += 1;
    }
  }
  return { inProductionCost, expectedProfit, realizedProfit, openCount, doneCount };
}

// ───────────────────────── Liste de courses (C3) ────────────────────────────

/** Une ligne de la liste de courses agrégée. */
export interface ShoppingLine {
  typeId: number;
  name: string;
  qty: number;
}

export interface ShoppingList {
  lines: ShoppingLine[];
  /** Format multibuy EVE (« Nom<tab>Quantité » par ligne), prêt à coller. */
  multibuy: string;
  /** Nombre de jobs ouverts agrégés. */
  jobCount: number;
}

/**
 * Agrège les matériaux de tous les jobs **ouverts** (planifiés + en cours) en une
 * seule liste d'achat, fusionnée par type, triée par quantité décroissante.
 * Pur — exportable en multibuy EVE.
 */
export function shoppingList(entries: LedgerEntry[]): ShoppingList {
  const byType = new Map<number, ShoppingLine>();
  let jobCount = 0;
  for (const e of entries) {
    if (e.status === "done" || !e.materials?.length) continue;
    jobCount += 1;
    for (const m of e.materials) {
      const ex = byType.get(m.typeId);
      if (ex) ex.qty += m.qty;
      else byType.set(m.typeId, { typeId: m.typeId, name: m.name, qty: m.qty });
    }
  }
  const lines = [...byType.values()].sort((a, b) => b.qty - a.qty);
  const multibuy = lines.map((l) => `${l.name}\t${Math.ceil(l.qty)}`).join("\n");
  return { lines, multibuy, jobCount };
}
