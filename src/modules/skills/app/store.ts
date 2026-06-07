import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { BASE_ATTRS, ZERO_IMPLANTS, type AttrSet } from "./lib/sp";
import type { PlanItem } from "./lib/plan";

interface SkillsState {
  /** Plan d'entraînement ordonné. */
  plan: PlanItem[];
  /** Attributs de base actuels (remap courant). */
  attrs: AttrSet;
  /** Implants par attribut (0–5). */
  implants: AttrSet;
  /** Clone Alpha (vitesse réduite) ou Omega. */
  alpha: boolean;

  addSkill: (skillId: number, from: number, to: number) => void;
  removeSkill: (skillId: number) => void;
  setLevels: (skillId: number, from: number, to: number) => void;
  clearPlan: () => void;
  setAttrs: (attrs: AttrSet) => void;
  setImplants: (implants: AttrSet) => void;
  setAlpha: (alpha: boolean) => void;
  importQueue: (items: PlanItem[]) => void;
}

export const useSkills = create<SkillsState>()(
  persist(
    (set) => ({
      plan: [],
      attrs: { ...BASE_ATTRS },
      implants: { ...ZERO_IMPLANTS },
      alpha: false,

      addSkill: (skillId, from, to) =>
        set((s) => {
          const exists = s.plan.find((p) => p.skillId === skillId);
          if (exists)
            return {
              plan: s.plan.map((p) =>
                p.skillId === skillId ? { ...p, from, to } : p,
              ),
            };
          return { plan: [...s.plan, { skillId, from, to }] };
        }),

      removeSkill: (skillId) =>
        set((s) => ({ plan: s.plan.filter((p) => p.skillId !== skillId) })),

      setLevels: (skillId, from, to) =>
        set((s) => ({
          plan: s.plan.map((p) =>
            p.skillId === skillId
              ? { ...p, from: Math.min(from, to), to }
              : p,
          ),
        })),

      clearPlan: () => set({ plan: [] }),
      setAttrs: (attrs) => set({ attrs }),
      setImplants: (implants) => set({ implants }),
      setAlpha: (alpha) => set({ alpha }),
      importQueue: (items) => set({ plan: items }),
    }),
    {
      name: "planner",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("skills")),
    },
  ),
);
