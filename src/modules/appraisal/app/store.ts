import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { Basis } from "./lib/compute";

/** Résumé d'un appraisal sauvegardé. */
export interface SavedAppraisal {
  id: string;
  createdAt: number;
  name: string;
  hubId: string;
  text: string;
  units: number;
  lines: number;
  buy: number;
  sell: number;
  volume: number;
}

let counter = 0;
const newId = () => `ap${Date.now().toString(36)}${counter++}`;

interface AppraisalState {
  text: string;
  hubId: string;
  vwap: boolean;
  basis: Basis;
  saved: SavedAppraisal[];

  setText: (t: string) => void;
  setHub: (id: string) => void;
  setVwap: (v: boolean) => void;
  setBasis: (b: Basis) => void;
  saveAppraisal: (s: Omit<SavedAppraisal, "id" | "createdAt">) => void;
  removeSaved: (id: string) => void;
}

export const useAppraisal = create<AppraisalState>()(
  persist(
    (set) => ({
      text: "",
      hubId: "jita",
      vwap: false,
      basis: "sell",
      saved: [],

      setText: (text) => set({ text }),
      setHub: (hubId) => set({ hubId }),
      setVwap: (vwap) => set({ vwap }),
      setBasis: (basis) => set({ basis }),
      saveAppraisal: (s) =>
        set((st) => ({ saved: [{ ...s, id: newId(), createdAt: Date.now() }, ...st.saved].slice(0, 100) })),
      removeSaved: (id) => set((st) => ({ saved: st.saved.filter((x) => x.id !== id) })),
    }),
    {
      name: "appraisal",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("appraisal")),
    },
  ),
);
