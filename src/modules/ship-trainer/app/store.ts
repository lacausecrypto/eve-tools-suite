import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";

/** Statistiques agrégées d'un mode de quiz. */
export interface ModeStats {
  /** Questions répondues (cumul). */
  answered: number;
  /** Bonnes réponses (cumul). */
  correct: number;
  /** Meilleure série (réponses justes d'affilée). */
  bestStreak: number;
  /** Meilleur score sur une session (justes / total). */
  bestScore: number;
}

const EMPTY: ModeStats = { answered: 0, correct: 0, bestStreak: 0, bestScore: 0 };

interface TrainerState {
  /** Stats par mode (clé = mode de quiz, ou "mixed"). */
  stats: Record<string, ModeStats>;
  /** Enregistre le résultat d'une session terminée. */
  recordSession: (
    key: string,
    result: { answered: number; correct: number; bestStreak: number },
  ) => void;
  /** Remet les statistiques à zéro. */
  reset: () => void;
}

/**
 * Progression d'entraînement persistée (namespace `ship-trainer`). 100 % local,
 * aucune donnée envoyée — uniquement des compteurs de réussite.
 */
export const useTrainer = create<TrainerState>()(
  persist(
    (set) => ({
      stats: {},
      recordSession: (key, result) =>
        set((s) => {
          const prev = s.stats[key] ?? EMPTY;
          const score = result.answered > 0 ? result.correct / result.answered : 0;
          return {
            stats: {
              ...s.stats,
              [key]: {
                answered: prev.answered + result.answered,
                correct: prev.correct + result.correct,
                bestStreak: Math.max(prev.bestStreak, result.bestStreak),
                bestScore: Math.max(prev.bestScore, score),
              },
            },
          };
        }),
      reset: () => set({ stats: {} }),
    }),
    {
      name: "trainer",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("ship-trainer")),
    },
  ),
);

/** Lit les stats d'un mode (valeur vide si absente). */
export function statsFor(stats: Record<string, ModeStats>, key: string): ModeStats {
  return stats[key] ?? EMPTY;
}
