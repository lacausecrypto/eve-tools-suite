import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { track } from "@/core/analytics";

/**
 * Espace de travail du shell — façon **navigateur** : plusieurs outils ouverts
 * en **onglets** (un par outil, état préservé), un onglet **dashboard** toujours
 * présent, et un onglet **réglages** à la demande. Les outils **épinglés**
 * alimentent le rail de favoris. État **persisté** (namespace `shell`).
 */
export type TabKind = "dashboard" | "tools" | "settings" | "module";

export interface Tab {
  /** Id unique d'onglet : `dashboard`, `settings`, ou `m:<moduleId>`. */
  id: string;
  kind: TabKind;
  moduleId?: string;
}

const DASHBOARD_TAB: Tab = { id: "dashboard", kind: "dashboard" };
const moduleTabId = (moduleId: string) => `m:${moduleId}`;

interface WorkspaceState {
  tabs: Tab[];
  activeId: string;
  pinned: string[];

  /** Ouvre (ou focalise) l'onglet d'un outil. */
  openModule: (moduleId: string) => void;
  /** Focalise le dashboard (toujours présent). */
  openDashboard: () => void;
  /** Ouvre (ou focalise) l'onglet catalogue d'outils. */
  openTools: () => void;
  /** Ouvre (ou focalise) l'onglet réglages. */
  openSettings: () => void;
  /** Ferme un onglet (le dashboard n'est pas fermable). */
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  /** Épingle / désépingle un outil (favoris du rail). */
  togglePin: (moduleId: string) => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      tabs: [DASHBOARD_TAB],
      activeId: "dashboard",
      pinned: [],

      openModule: (moduleId) =>
        set((s) => {
          const id = moduleTabId(moduleId);
          // Analytics (no-op sans opt-in) : quel outil est ouvert/focalisé.
          track("tool_opened", { tool: moduleId });
          if (s.tabs.some((t) => t.id === id)) return { activeId: id };
          return {
            tabs: [...s.tabs, { id, kind: "module", moduleId }],
            activeId: id,
          };
        }),

      openDashboard: () =>
        set((s) => ({
          tabs: s.tabs.some((t) => t.id === "dashboard")
            ? s.tabs
            : [DASHBOARD_TAB, ...s.tabs],
          activeId: "dashboard",
        })),

      openTools: () =>
        set((s) => {
          if (s.tabs.some((t) => t.id === "tools")) return { activeId: "tools" };
          return {
            tabs: [...s.tabs, { id: "tools", kind: "tools" }],
            activeId: "tools",
          };
        }),

      openSettings: () =>
        set((s) => {
          if (s.tabs.some((t) => t.id === "settings"))
            return { activeId: "settings" };
          return {
            tabs: [...s.tabs, { id: "settings", kind: "settings" }],
            activeId: "settings",
          };
        }),

      closeTab: (id) =>
        set((s) => {
          if (id === "dashboard") return s; // non fermable
          const idx = s.tabs.findIndex((t) => t.id === id);
          if (idx < 0) return s;
          const tabs = s.tabs.filter((t) => t.id !== id);
          const safe = tabs.length ? tabs : [DASHBOARD_TAB];
          let activeId = s.activeId;
          if (activeId === id) {
            const neighbor = safe[Math.min(idx, safe.length - 1)] ?? DASHBOARD_TAB;
            activeId = neighbor.id;
          }
          return { tabs: safe, activeId };
        }),

      setActive: (id) => set({ activeId: id }),

      togglePin: (moduleId) =>
        set((s) => ({
          pinned: s.pinned.includes(moduleId)
            ? s.pinned.filter((x) => x !== moduleId)
            : [...s.pinned, moduleId],
        })),
    }),
    {
      name: "workspace",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("shell")),
    },
  ),
);
