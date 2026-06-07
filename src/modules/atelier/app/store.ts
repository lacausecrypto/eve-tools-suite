import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import type { DamageProfile } from "./lib/types";

/**
 * Profils de dégâts prêts à l'emploi (NPC courants + omni). Le libellé est rendu
 * via `t("atelier.profile." + id)`.
 */
export const DAMAGE_PROFILES: { id: string; profile: DamageProfile }[] = [
  { id: "omni", profile: { em: 0.25, th: 0.25, kin: 0.25, exp: 0.25 } },
  { id: "guristas", profile: { em: 0, th: 0.21, kin: 0.79, exp: 0 } },
  { id: "serpentis", profile: { em: 0, th: 0.52, kin: 0.48, exp: 0 } },
  { id: "angel", profile: { em: 0.02, th: 0.16, kin: 0.37, exp: 0.45 } },
  { id: "sansha", profile: { em: 0.52, th: 0.48, kin: 0, exp: 0 } },
  { id: "bloodraider", profile: { em: 0.62, th: 0.38, kin: 0, exp: 0 } },
];

/** Résumé compact d'un fit sauvegardé. */
export interface FitSummary {
  ehp: number;
  dps: number;
  capStable: boolean;
  align: number;
}

/** Fit sauvegardé (on garde le texte EFT brut pour réanalyser au rechargement). */
export interface SavedFit {
  id: string;
  createdAt: number;
  shipTypeId: number;
  shipName: string;
  fitName: string;
  eft: string;
  summary: FitSummary;
}

let counter = 0;
const newId = () => `f${Date.now().toString(36)}${counter++}`;

interface AtelierState {
  eft: string;
  allFiveHp: boolean;
  profileId: string;
  savedFits: SavedFit[];

  setEft: (eft: string) => void;
  setAllFiveHp: (v: boolean) => void;
  setProfileId: (id: string) => void;
  saveFit: (f: Omit<SavedFit, "id" | "createdAt">) => void;
  removeFit: (id: string) => void;
}

export const useAtelier = create<AtelierState>()(
  persist(
    (set) => ({
      eft: "",
      allFiveHp: true,
      profileId: "omni",
      savedFits: [],

      setEft: (eft) => set({ eft }),
      setAllFiveHp: (allFiveHp) => set({ allFiveHp }),
      setProfileId: (profileId) => set({ profileId }),
      saveFit: (f) =>
        set((s) => ({
          savedFits: [{ ...f, id: newId(), createdAt: Date.now() }, ...s.savedFits].slice(0, 50),
        })),
      removeFit: (id) => set((s) => ({ savedFits: s.savedFits.filter((x) => x.id !== id) })),
    }),
    {
      name: "atelier",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("atelier")),
    },
  ),
);

export function profileById(id: string): DamageProfile {
  return (DAMAGE_PROFILES.find((p) => p.id === id) ?? DAMAGE_PROFILES[0]).profile;
}
