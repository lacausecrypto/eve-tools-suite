import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { toast } from "@/core/toast";
import { TRACKS } from "./data/curriculum";
import { BADGES } from "./data/badges";
import { levelFromXp, XP } from "./lib/xp";
import type { BadgeContext } from "./lib/types";

/** État Leitner d'une carte (répétition espacée). */
interface SrsCard {
  box: number; // 1..5
  due: string; // YYYY-MM-DD
}

interface AcademyState {
  xp: number;
  completedLessons: string[];
  quizBest: Record<string, number>; // quizId → meilleur score (0..1)
  earnedBadges: string[];
  streak: number;
  lastActiveDay: string | null;
  srs: Record<string, SrsCard>;
  reviewedCards: number;
  /** Meilleurs records des modes arcade (valeur entière : score / série). */
  gameBest: Record<string, number>;

  completeLesson: (id: string) => void;
  recordQuiz: (quizId: string, score: number) => void;
  reviewCard: (cardId: string, ok: boolean) => void;
  recordGame: (gameId: string, value: number, xpGain: number) => void;
  touchDay: () => void;
  reset: () => void;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Intervalle (jours) de révision selon la boîte Leitner. */
const BOX_DAYS = [0, 1, 2, 4, 7, 14];

/** Construit le contexte d'évaluation des badges depuis l'état. */
export function buildContext(s: AcademyState): BadgeContext {
  const completed = new Set(s.completedLessons);
  const tracksCompleted = TRACKS.filter((t) =>
    t.lessons.every((l) => completed.has(l.id)),
  ).map((t) => t.id);
  const perfectQuizzes = Object.values(s.quizBest).filter((v) => v >= 0.999).length;
  return {
    xp: s.xp,
    level: levelFromXp(s.xp).level,
    completedLessons: s.completedLessons,
    quizBest: s.quizBest,
    streak: s.streak,
    reviewedCards: s.reviewedCards,
    tracksCompleted,
    perfectQuizzes,
  };
}

export const useAcademy = create<AcademyState>()(
  persist(
    (set, get) => {
      /** Récompense XP + détecte montée de niveau et nouveaux badges (toasts). */
      const award = (xpGain: number) => {
        const beforeLevel = levelFromXp(get().xp).level;
        if (xpGain > 0) set((s) => ({ xp: s.xp + xpGain }));

        const after = levelFromXp(get().xp);
        if (after.level > beforeLevel) {
          toast.success(`Niveau ${after.level} !`, after.title);
        }

        // Nouveaux badges.
        const ctx = buildContext(get());
        const earned = new Set(get().earnedBadges);
        const fresh = BADGES.filter((b) => !earned.has(b.id) && b.earned(ctx));
        if (fresh.length) {
          set({ earnedBadges: [...earned, ...fresh.map((b) => b.id)] });
          for (const b of fresh) toast.success("Badge débloqué", b.title);
        }
      };

      return {
        xp: 0,
        completedLessons: [],
        quizBest: {},
        earnedBadges: [],
        streak: 0,
        lastActiveDay: null,
        srs: {},
        reviewedCards: 0,
        gameBest: {},

        completeLesson: (id) => {
          if (get().completedLessons.includes(id)) return;
          set((s) => ({ completedLessons: [...s.completedLessons, id] }));
          award(XP.lesson);
        },

        recordQuiz: (quizId, score) => {
          const prev = get().quizBest[quizId] ?? 0;
          let gain = 0;
          if (score >= 0.6 && prev < 0.6) gain += XP.quizPass;
          if (score >= 0.999 && prev < 0.999) gain += XP.quizPerfect - XP.quizPass;
          set((s) => ({
            quizBest: { ...s.quizBest, [quizId]: Math.max(prev, score) },
          }));
          award(gain);
        },

        reviewCard: (cardId, ok) => {
          const prev = get().srs[cardId];
          const box = ok ? Math.min((prev?.box ?? 0) + 1, 5) : 1;
          const due = new Date();
          due.setDate(due.getDate() + BOX_DAYS[box]);
          set((s) => ({
            srs: { ...s.srs, [cardId]: { box, due: ymd(due) } },
            reviewedCards: s.reviewedCards + 1,
          }));
          award(ok ? XP.card : 0);
        },

        recordGame: (gameId, value, xpGain) => {
          const prev = get().gameBest[gameId] ?? 0;
          set((s) => ({
            gameBest: { ...s.gameBest, [gameId]: Math.max(prev, value) },
          }));
          award(Math.max(0, xpGain));
        },

        touchDay: () => {
          const today = ymd(new Date());
          const last = get().lastActiveDay;
          if (last === today) return;
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const streak = last === ymd(y) ? get().streak + 1 : 1;
          set({ streak, lastActiveDay: today });
          award(0); // ré-évalue les badges de série
        },

        reset: () =>
          set({
            xp: 0,
            completedLessons: [],
            quizBest: {},
            earnedBadges: [],
            streak: 0,
            lastActiveDay: null,
            srs: {},
            reviewedCards: 0,
            gameBest: {},
          }),
      };
    },
    {
      name: "academy",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("academy")),
    },
  ),
);

/** Cartes dues aujourd'hui (jamais vues ou échéance passée). */
export function isDue(srs: Record<string, SrsCard>, cardId: string, today = ymd(new Date())): boolean {
  const c = srs[cardId];
  return !c || c.due <= today;
}
