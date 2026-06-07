import { create } from "zustand";
import { track } from "@/core/analytics";
import { useSettings } from "@/core/settings";
import type { ModuleTour, TourStep } from "./types";

interface TourState {
  tour: ModuleTour | null;
  index: number;
  /** Restauration des données de démo (rendue par `tour.demo()`). */
  restore?: () => void;

  start: (tour: ModuleTour) => void;
  next: () => void;
  prev: () => void;
  /** Fin normale (dernière étape atteinte ou bouton « Terminer »). */
  end: () => void;
  /** Abandon (croix, « Passer » ou Échap). */
  skip: () => void;
}

export const useTour = create<TourState>((set, get) => ({
  tour: null,
  index: 0,
  restore: undefined,

  start: (tour) => {
    // Si un tour était en cours, restaure d'abord ses données de démo.
    get().restore?.();
    const restore = tour.demo?.();
    track("tour_started", { tour_id: tour.id, steps: tour.steps.length });
    track("tour_step_viewed", { tour_id: tour.id, step: 0 });
    set({
      tour,
      index: 0,
      restore: typeof restore === "function" ? restore : undefined,
    });
  },

  next: () => {
    const { tour, index } = get();
    if (!tour) return;
    if (index >= tour.steps.length - 1) return get().end();
    const step = index + 1;
    track("tour_step_viewed", { tour_id: tour.id, step });
    set({ index: step });
  },

  prev: () => {
    const { index } = get();
    set({ index: Math.max(0, index - 1) });
  },

  end: () => finish("complete", set, get),
  skip: () => finish("skip", set, get),
}));

function finish(
  kind: "complete" | "skip",
  set: (p: Partial<TourState>) => void,
  get: () => TourState,
) {
  const { tour, index, restore } = get();
  restore?.();
  if (tour) {
    useSettings.getState().markTourSeen(tour.id);
    track(kind === "skip" ? "tour_skipped" : "tour_completed", {
      tour_id: tour.id,
      step: index,
    });
  }
  set({ tour: null, index: 0, restore: undefined });
}

/** Étape courante (ou null). */
export function currentStep(state: TourState): TourStep | null {
  return state.tour ? state.tour.steps[state.index] ?? null : null;
}
