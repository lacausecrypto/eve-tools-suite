import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { Skills } from "./lib/refine";

export type Mode = "reprocess" | "compress";
export type MatBasis = "sell" | "buy";

interface RefineState {
  mode: Mode;
  /** Texte de minerai collé (mode reprocess). */
  text: string;
  /** Cibles de minéraux (mode compress) : mineralId → quantité. */
  targets: Record<number, number>;

  baseRatePct: number;
  skills: Skills;
  matBasis: MatBasis;
  /** Mode compress : n'utiliser que le minerai compressé. */
  compressedOnly: boolean;

  setMode: (m: Mode) => void;
  setText: (t: string) => void;
  setTarget: (mineralId: number, qty: number) => void;
  clearTargets: () => void;
  setBaseRate: (n: number) => void;
  setSkills: (patch: Partial<Skills>) => void;
  setMatBasis: (b: MatBasis) => void;
  setCompressedOnly: (v: boolean) => void;
}

export const useRefine = create<RefineState>()(
  persist(
    (set) => ({
      mode: "reprocess",
      text: "",
      targets: {},
      baseRatePct: 50,
      skills: { reprocessing: 5, efficiency: 5, oreProcessing: 5, implantPct: 4 },
      matBasis: "sell",
      compressedOnly: true,

      setMode: (mode) => set({ mode }),
      setText: (text) => set({ text }),
      setTarget: (mineralId, qty) =>
        set((s) => {
          const t = { ...s.targets };
          if (qty > 0) t[mineralId] = qty;
          else delete t[mineralId];
          return { targets: t };
        }),
      clearTargets: () => set({ targets: {} }),
      setBaseRate: (baseRatePct) => set({ baseRatePct: Math.max(0, baseRatePct) }),
      setSkills: (patch) => set((s) => ({ skills: { ...s.skills, ...patch } })),
      setMatBasis: (matBasis) => set({ matBasis }),
      setCompressedOnly: (compressedOnly) => set({ compressedOnly }),
    }),
    {
      name: "refine",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("refine")),
    },
  ),
);
