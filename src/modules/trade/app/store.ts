import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { DEFAULT_FEES, type FeeConfig, type SellStrategy } from "./lib/types";
import { DEFAULT_STATION_PARAMS, type ArbitrageSort, type StationParams } from "./lib/scan";
import type { HubId } from "./lib/hubs";
import { SHIP_PRESETS, type HaulItem } from "./lib/haul";

/** Résumé compact d'un itinéraire sauvegardé (pour l'historique). */
export interface HaulSummary {
  profit: number;
  volume: number;
  trips: number;
  totalJumps: number;
}

/** Itinéraire de hauling sauvegardé. */
export interface SavedHaul {
  id: string;
  createdAt: number;
  name: string;
  items: HaulItem[];
  cargo: number;
  shipId: string;
  secure: boolean;
  summary: HaulSummary;
}

/** Clé d'unicité d'un item de hauling (objet + segment). */
export const haulItemKey = (i: HaulItem) => `${i.typeId}>${i.srcHubId}>${i.dstHubId}`;

let haulCounter = 0;
const newHaulId = () => `h${Date.now().toString(36)}${haulCounter++}`;

interface TradeState {
  fees: FeeConfig;
  station: StationParams;
  stationHub: HubId;

  arbSrc: HubId;
  arbDst: HubId;
  strategy: SellStrategy;
  arbSort: ArbitrageSort;
  candidateMode: "curated" | "paste" | "scan";
  pasteList: string;

  mbHub: HubId;
  mbText: string;
  mbCompare: boolean;

  // Planificateur d'itinéraire (hauling)
  haulItems: HaulItem[];
  haulShipId: string;
  haulCargo: number;
  haulSecure: boolean;
  savedHauls: SavedHaul[];

  setFees: (patch: Partial<FeeConfig>) => void;
  setStation: (patch: Partial<StationParams>) => void;
  setStationHub: (h: HubId) => void;
  setArb: (patch: Partial<Pick<TradeState, "arbSrc" | "arbDst" | "strategy" | "arbSort" | "candidateMode" | "pasteList">>) => void;
  setMb: (patch: Partial<Pick<TradeState, "mbHub" | "mbText" | "mbCompare">>) => void;

  /** Ajoute des objets au panier de hauling (dédupliqués par objet + segment). */
  addHaul: (items: HaulItem[]) => void;
  removeHaulItem: (key: string) => void;
  clearHaul: () => void;
  setHaulConfig: (patch: Partial<Pick<TradeState, "haulShipId" | "haulCargo" | "haulSecure">>) => void;
  /** Sauvegarde l'itinéraire courant dans l'historique. */
  saveHaul: (name: string, summary: HaulSummary) => void;
  removeSavedHaul: (id: string) => void;
  /** Recharge un itinéraire sauvegardé dans le panier courant. */
  loadSavedHaul: (id: string) => void;
}

/** Réglages du Trade Co-Pilot — persistés (namespace `trade`). */
export const useTrade = create<TradeState>()(
  persist(
    (set) => ({
      fees: DEFAULT_FEES,
      station: DEFAULT_STATION_PARAMS,
      stationHub: "forge",

      arbSrc: "forge",
      arbDst: "domain",
      strategy: "buyOrders",
      arbSort: "total",
      candidateMode: "curated",
      pasteList: "",

      mbHub: "forge",
      mbText: "",
      mbCompare: false,

      haulItems: [],
      haulShipId: SHIP_PRESETS[2].id, // Deep Space Transport par défaut
      haulCargo: SHIP_PRESETS[2].cargo,
      haulSecure: true,
      savedHauls: [],

      setFees: (patch) => set((s) => ({ fees: { ...s.fees, ...patch } })),
      setStation: (patch) => set((s) => ({ station: { ...s.station, ...patch } })),
      setStationHub: (stationHub) => set({ stationHub }),
      setArb: (patch) => set(patch),
      setMb: (patch) => set(patch),

      addHaul: (items) =>
        set((s) => {
          const map = new Map(s.haulItems.map((i) => [haulItemKey(i), i]));
          for (const it of items) map.set(haulItemKey(it), it);
          return { haulItems: [...map.values()] };
        }),
      removeHaulItem: (key) =>
        set((s) => ({ haulItems: s.haulItems.filter((i) => haulItemKey(i) !== key) })),
      clearHaul: () => set({ haulItems: [] }),
      setHaulConfig: (patch) => set(patch),

      saveHaul: (name, summary) =>
        set((s) => ({
          savedHauls: [
            {
              id: newHaulId(),
              createdAt: Date.now(),
              name: name.trim() || "Itinéraire",
              items: s.haulItems,
              cargo: s.haulCargo,
              shipId: s.haulShipId,
              secure: s.haulSecure,
              summary,
            },
            ...s.savedHauls,
          ],
        })),
      removeSavedHaul: (id) =>
        set((s) => ({ savedHauls: s.savedHauls.filter((h) => h.id !== id) })),
      loadSavedHaul: (id) =>
        set((s) => {
          const h = s.savedHauls.find((x) => x.id === id);
          if (!h) return s;
          return {
            haulItems: h.items,
            haulCargo: h.cargo,
            haulShipId: h.shipId,
            haulSecure: h.secure,
          };
        }),
    }),
    {
      name: "trade",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("trade")),
    },
  ),
);
