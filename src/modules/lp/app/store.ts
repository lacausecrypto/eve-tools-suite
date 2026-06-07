import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { FeeConfig, OutBasis } from "./lib/compute";

interface LpState {
  corpId: number | null;
  outBasis: OutBasis;
  fees: FeeConfig;
  /** Solde de LP pour le plan de conversion (0 = ignoré). */
  lpBalance: number;
  /** Filtre de liquidité minimale (volume d'ordres de vente). */
  minVolume: number;
  /** Masquer les offres non rentables. */
  profitableOnly: boolean;

  setCorp: (id: number) => void;
  setBasis: (b: OutBasis) => void;
  setFees: (patch: Partial<FeeConfig>) => void;
  setLpBalance: (n: number) => void;
  setMinVolume: (n: number) => void;
  setProfitableOnly: (v: boolean) => void;
}

export const useLp = create<LpState>()(
  persist(
    (set) => ({
      corpId: null,
      outBasis: "sell",
      fees: { salesTaxPct: 4.5, brokerPct: 1.5 },
      lpBalance: 0,
      minVolume: 0,
      profitableOnly: true,

      setCorp: (corpId) => set({ corpId }),
      setBasis: (outBasis) => set({ outBasis }),
      setFees: (patch) => set((s) => ({ fees: { ...s.fees, ...patch } })),
      setLpBalance: (lpBalance) => set({ lpBalance: Math.max(0, lpBalance) }),
      setMinVolume: (minVolume) => set({ minVolume: Math.max(0, minVolume) }),
      setProfitableOnly: (profitableOnly) => set({ profitableOnly }),
    }),
    {
      name: "lp",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("lp")),
    },
  ),
);
