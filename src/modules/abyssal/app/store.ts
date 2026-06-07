import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { AttrScore } from "./lib/types";

/** Roll évalué, mémorisé pour comparer plusieurs modules. */
export interface SavedRoll {
  id: string;
  createdAt: number;
  resultName: string;
  baseName: string;
  mutatorName: string;
  resultTypeId: number;
  overall: number;
  basePrice: number;
  mutatorPrice: number;
  /** Estimation de revente MutaMarket (null si non répertorié). */
  estimatedValue: number | null;
  attrs: AttrScore[];
}

let counter = 0;
const newId = () => `m${Date.now().toString(36)}${counter++}`;

interface AbyssalState {
  saved: SavedRoll[];
  saveRoll: (r: Omit<SavedRoll, "id" | "createdAt">) => void;
  removeRoll: (id: string) => void;
}

export const useAbyssal = create<AbyssalState>()(
  persist(
    (set) => ({
      saved: [],
      saveRoll: (r) =>
        set((s) => ({ saved: [{ ...r, id: newId(), createdAt: Date.now() }, ...s.saved].slice(0, 100) })),
      removeRoll: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
    }),
    {
      name: "abyssal",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("abyssal")),
    },
  ),
);
