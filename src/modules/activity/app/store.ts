import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { draftSeconds, mergeLoot } from "./lib/compute";
import type { ActivityId, Draft, Entry, LootLine, PriceBasis, Session } from "./lib/types";

let counter = 0;
const newId = () => `a${Date.now().toString(36)}${counter++}`;

function freshDraft(activity: ActivityId): Draft {
  return {
    activity,
    siteLabel: "",
    runningSince: null,
    accumulatedSec: 0,
    runs: 0,
    loot: [],
    income: [],
    costs: [],
    note: "",
  };
}

interface ActivityState {
  current: Draft;
  history: Session[];
  basis: PriceBasis;

  setBasis: (b: PriceBasis) => void;
  setActivity: (a: ActivityId) => void;
  setSite: (s: string) => void;
  setNote: (n: string) => void;
  setRuns: (n: number) => void;

  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;

  addLoot: (lines: LootLine[]) => void;
  removeLoot: (typeId: number) => void;
  clearLoot: () => void;

  addEntry: (kind: "income" | "costs", label: string, isk: number) => void;
  removeEntry: (kind: "income" | "costs", id: string) => void;

  finishSession: () => void;
  removeSession: (id: string) => void;
  clearCurrent: () => void;
}

export const useActivity = create<ActivityState>()(
  persist(
    (set) => ({
      current: freshDraft("ratting"),
      history: [],
      basis: "buy",

      setBasis: (basis) => set({ basis }),
      setActivity: (activity) => set((s) => ({ current: { ...s.current, activity } })),
      setSite: (siteLabel) => set((s) => ({ current: { ...s.current, siteLabel } })),
      setNote: (note) => set((s) => ({ current: { ...s.current, note } })),
      setRuns: (runs) => set((s) => ({ current: { ...s.current, runs: Math.max(0, Math.round(runs)) } })),

      startTimer: () =>
        set((s) =>
          s.current.runningSince != null ? s : { current: { ...s.current, runningSince: Date.now() } },
        ),
      pauseTimer: () =>
        set((s) => {
          if (s.current.runningSince == null) return s;
          const acc = draftSeconds(s.current.accumulatedSec, s.current.runningSince, Date.now());
          return { current: { ...s.current, runningSince: null, accumulatedSec: acc } };
        }),
      resetTimer: () => set((s) => ({ current: { ...s.current, runningSince: null, accumulatedSec: 0 } })),

      addLoot: (lines) => set((s) => ({ current: { ...s.current, loot: mergeLoot(s.current.loot, lines) } })),
      removeLoot: (typeId) =>
        set((s) => ({ current: { ...s.current, loot: s.current.loot.filter((l) => l.typeId !== typeId) } })),
      clearLoot: () => set((s) => ({ current: { ...s.current, loot: [] } })),

      addEntry: (kind, label, isk) =>
        set((s) => {
          const entry: Entry = { id: newId(), label: label.trim() || "Entrée", isk };
          return { current: { ...s.current, [kind]: [...s.current[kind], entry] } };
        }),
      removeEntry: (kind, id) =>
        set((s) => ({ current: { ...s.current, [kind]: s.current[kind].filter((e) => e.id !== id) } })),

      finishSession: () =>
        set((s) => {
          const dur = draftSeconds(s.current.accumulatedSec, s.current.runningSince, Date.now());
          const c = s.current;
          if (dur < 1 && c.loot.length === 0 && c.income.length === 0 && c.costs.length === 0) return s;
          const sess: Session = {
            id: newId(),
            activity: c.activity,
            siteLabel: c.siteLabel,
            durationSec: dur,
            runs: c.runs,
            loot: c.loot,
            income: c.income,
            costs: c.costs,
            note: c.note,
            createdAt: Date.now(),
          };
          return { history: [sess, ...s.history].slice(0, 200), current: freshDraft(c.activity) };
        }),
      removeSession: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clearCurrent: () => set((s) => ({ current: freshDraft(s.current.activity) })),
    }),
    {
      name: "activity",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("activity")),
    },
  ),
);
