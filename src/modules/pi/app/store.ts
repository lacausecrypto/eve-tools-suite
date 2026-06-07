import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { ExtractionConfig, PiSetup } from "./lib/setup";

const MAX_COMPARE = 3;

interface PiState {
  setups: PiSetup[];
  /** Ids sélectionnés pour la comparaison (max 3). */
  compareIds: string[];
  /** Enregistre un nouveau setup à partir d'une config + nom + propriétaire. */
  saveSetup: (name: string, owner: string, cfg: ExtractionConfig) => void;
  removeSetup: (id: string) => void;
  renameSetup: (id: string, name: string) => void;
  /** Marque le programme d'extraction comme (re)démarré maintenant (planning). */
  restartSetup: (id: string) => void;
  /** Ajoute/retire un setup de la comparaison (borné à 3). */
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  /** Importe des setups (réattribue des ids neufs pour éviter les collisions). */
  importSetups: (incoming: PiSetup[]) => number;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter}`;
}

/**
 * Portefeuille PI persisté (namespace `pi` du stockage de la suite) :
 * setups multi-planètes / multi-alts + sélection de comparaison.
 */
export const usePiSetups = create<PiState>()(
  persist(
    (set) => ({
      setups: [],
      compareIds: [],

      saveSetup: (name, owner, cfg) =>
        set((s) => {
          const now = Date.now();
          return {
            setups: [
              ...s.setups,
              {
                ...cfg,
                id: newId(),
                name: name.trim() || "Setup",
                owner: owner.trim(),
                createdAt: now,
                startedAt: now,
              },
            ],
          };
        }),

      removeSetup: (id) =>
        set((s) => ({
          setups: s.setups.filter((x) => x.id !== id),
          compareIds: s.compareIds.filter((x) => x !== id),
        })),

      renameSetup: (id, name) =>
        set((s) => ({
          setups: s.setups.map((x) =>
            x.id === id ? { ...x, name: name.trim() || x.name } : x,
          ),
        })),

      restartSetup: (id) =>
        set((s) => ({
          setups: s.setups.map((x) =>
            x.id === id ? { ...x, startedAt: Date.now() } : x,
          ),
        })),

      toggleCompare: (id) =>
        set((s) => {
          if (s.compareIds.includes(id))
            return { compareIds: s.compareIds.filter((x) => x !== id) };
          if (s.compareIds.length >= MAX_COMPARE) return s;
          return { compareIds: [...s.compareIds, id] };
        }),

      clearCompare: () => set({ compareIds: [] }),

      importSetups: (incoming) => {
        const now = Date.now();
        const fresh = incoming.map((s) => ({
          ...s,
          id: newId(),
          createdAt: s.createdAt || now,
          startedAt: s.startedAt || s.createdAt || now,
        }));
        set((st) => ({ setups: [...st.setups, ...fresh] }));
        return fresh.length;
      },
    }),
    {
      name: "setups",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("pi")),
    },
  ),
);

export { MAX_COMPARE };
