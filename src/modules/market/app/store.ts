import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { DEFAULT_FILTERS, type OrderFilters } from "./lib/types";
import { DEFAULT_SCOPE, type ScopeId } from "./lib/regions";

interface MarketState {
  /** Type sélectionné (et son nom canonique, pour l'affichage immédiat). */
  selectedTypeId: number | null;
  selectedName: string | null;
  /** Portée de marché (hub / agrégat). */
  scope: ScopeId;
  /** Filtres du carnet d'ordres. */
  filters: OrderFilters;
  /** Liste de suivi (type_ids favoris). */
  watchlist: number[];

  select: (typeId: number, name: string) => void;
  setScope: (scope: ScopeId) => void;
  setFilters: (patch: Partial<OrderFilters>) => void;
  resetFilters: () => void;
  toggleWatch: (typeId: number) => void;
}

/** État du Market Browser — persisté dans le namespace `market`. */
export const useMarket = create<MarketState>()(
  persist(
    (set) => ({
      selectedTypeId: null,
      selectedName: null,
      scope: DEFAULT_SCOPE,
      filters: DEFAULT_FILTERS,
      watchlist: [],

      select: (selectedTypeId, selectedName) => set({ selectedTypeId, selectedName }),
      setScope: (scope) => set({ scope }),
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      toggleWatch: (typeId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(typeId)
            ? s.watchlist.filter((id) => id !== typeId)
            : [...s.watchlist, typeId],
        })),
    }),
    {
      name: "market",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("market")),
      // On ne persiste pas la sélection courante (re-fetch au démarrage).
      partialize: (s) => ({ scope: s.scope, filters: s.filters, watchlist: s.watchlist }),
    },
  ),
);
