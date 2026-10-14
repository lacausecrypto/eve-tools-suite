import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { DEFAULT_NOTIFICATION_RULES } from "./catalog";
import type {
  NotificationHistoryItem,
  NotificationRule,
  NotificationRuleState,
} from "./types";

const HISTORY_LIMIT = 200;

interface NotificationCenterState {
  rules: NotificationRule[];
  ruleStates: Record<string, NotificationRuleState>;
  history: NotificationHistoryItem[];
  lastEvents: Record<string, import("./types").NotificationEvent>;
  addRule: (rule: NotificationRule) => void;
  updateRule: (id: string, patch: Partial<NotificationRule>) => void;
  removeRule: (id: string) => void;
  setRuleState: (id: string, state: NotificationRuleState) => void;
  addHistory: (item: NotificationHistoryItem) => void;
  markAllRead: () => void;
  clearHistory: () => void;
  rememberEvent: (event: import("./types").NotificationEvent) => void;
}

export const useNotificationCenter = create<NotificationCenterState>()(
  persist(
    (set) => ({
      rules: DEFAULT_NOTIFICATION_RULES,
      ruleStates: {},
      history: [],
      lastEvents: {},
      addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
      updateRule: (id, patch) =>
        set((state) => ({
          rules: state.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
        })),
      removeRule: (id) =>
        set((state) => {
          const ruleStates = { ...state.ruleStates };
          delete ruleStates[id];
          return {
            rules: state.rules.filter((rule) => rule.id !== id),
            ruleStates,
          };
        }),
      setRuleState: (id, ruleState) =>
        set((state) => ({ ruleStates: { ...state.ruleStates, [id]: ruleState } })),
      addHistory: (item) =>
        set((state) => ({ history: [item, ...state.history].slice(0, HISTORY_LIMIT) })),
      markAllRead: () =>
        set((state) => ({
          history: state.history.map((item) => ({ ...item, unread: false })),
        })),
      clearHistory: () => set({ history: [] }),
      rememberEvent: (event) =>
        set((state) => ({ lastEvents: { ...state.lastEvents, [event.type]: event } })),
    }),
    {
      name: "notification-center",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("shell")),
      partialize: (state) => ({
        rules: state.rules,
        ruleStates: state.ruleStates,
        history: state.history,
        lastEvents: state.lastEvents,
      }),
    },
  ),
);

export function notificationUnreadCount(): number {
  return useNotificationCenter.getState().history.filter((item) => item.unread).length;
}
