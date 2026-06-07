import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LucideIcon } from "lucide-react";
import { namespacedStorage } from "@/core/storage/persist";
import { listModules } from "@/core/module/registry";
import type {
  ToolWidget,
  WidgetConfig,
  WidgetSize,
} from "@/core/module/types";
import type { LocalizedText } from "@/core/i18n";

/**
 * Tableau de bord **canvas** : l'utilisateur compose sa page d'accueil avec des
 * **instances** de widgets (KPIs/graphes) qu'il place, redimensionne et configure
 * librement sur une grille magnétique. État persisté.
 */

export const COLS = 12;

const SIZE: Record<WidgetSize, { w: number; h: number }> = {
  sm: { w: 3, h: 2 },
  md: { w: 4, h: 3 },
  lg: { w: 6, h: 3 },
};

/** Infos minimales d'un fournisseur de widget (outil ou source « core »). */
export interface WidgetOwner {
  id: string;
  name: LocalizedText;
  accent: string;
  icon: LucideIcon;
}

export interface WidgetEntry {
  /** Id global `<ownerId>:<widgetId>`. */
  gid: string;
  owner: WidgetOwner;
  widget: ToolWidget;
}

// --- Widgets « core » (non rattachés à un outil : compte, personnage…) -------

interface CoreSource {
  owner: WidgetOwner;
  widgets: ToolWidget[];
}
const coreSources: CoreSource[] = [];

/**
 * Enregistre des widgets transverses (appelé par le shell au démarrage).
 * Idempotent : remplace une source de même `owner.id` (évite les doublons au
 * rechargement à chaud en dev).
 */
export function registerCoreWidgets(src: CoreSource): void {
  const i = coreSources.findIndex((s) => s.owner.id === src.owner.id);
  if (i >= 0) coreSources[i] = src;
  else coreSources.push(src);
}

/** Tous les widgets disponibles (outils + core). */
export function allWidgets(): WidgetEntry[] {
  const out: WidgetEntry[] = [];
  for (const m of listModules()) {
    for (const w of m.widgets ?? []) {
      out.push({ gid: `${m.id}:${w.id}`, owner: m, widget: w });
    }
  }
  for (const src of coreSources) {
    for (const w of src.widgets) {
      out.push({ gid: `${src.owner.id}:${w.id}`, owner: src.owner, widget: w });
    }
  }
  return out;
}

export function widgetByGid(gid: string): WidgetEntry | undefined {
  return allWidgets().find((w) => w.gid === gid);
}

// --- Modèle d'instance -------------------------------------------------------

export interface WidgetInstance {
  id: string;
  gid: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: WidgetConfig;
}

// --- Résolution de collisions (poussée vers le bas, en cascade) --------------

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/**
 * Empêche les chevauchements : `primaryId` (le widget manipulé) reste **fixe**,
 * les widgets qu'il percute sont décalés **vers le bas**, en cascade. Sinon, sur
 * collision, le widget le plus bas passe sous l'autre. Converge (y croît).
 */
export function resolveCollisions<T extends Box>(
  items: T[],
  primaryId?: string,
): T[] {
  const list = items.map((i) => ({ ...i }));
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 300) {
    changed = false;
    list.sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const A = list[i];
        const B = list[j];
        if (!overlaps(A, B)) continue;
        let anchor: Box;
        let mover: Box;
        if (A.id === primaryId) {
          anchor = A;
          mover = B;
        } else if (B.id === primaryId) {
          anchor = B;
          mover = A;
        } else if (A.y <= B.y) {
          anchor = A;
          mover = B;
        } else {
          anchor = B;
          mover = A;
        }
        const ny = anchor.y + anchor.h;
        if (ny > mover.y) {
          mover.y = ny;
          changed = true;
        }
      }
    }
  }
  return list;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `w${Date.now().toString(36)}${counter}`;
}

function sizeOf(size?: WidgetSize) {
  return SIZE[size ?? "sm"];
}

function defaultConfig(widget: ToolWidget): WidgetConfig {
  const c: WidgetConfig = {};
  for (const f of widget.config ?? [])
    if (f.default !== undefined) c[f.key] = f.default;
  return c;
}

function bottomY(instances: WidgetInstance[]): number {
  return instances.reduce((m, i) => Math.max(m, i.y + i.h), 0);
}

interface DashboardState {
  instances: WidgetInstance[];
  /** Mode édition (drag/resize/config) actif. */
  editing: boolean;
  /** gids déjà proposés une fois (ne pas ré-ajouter ceux retirés). */
  known: string[];

  toggleEdit: () => void;
  /** Ajoute une instance d'un widget (auto-placée en bas). */
  add: (gid: string) => void;
  removeInstance: (id: string) => void;
  /** Applique un lot de positions/tailles (commit après drag/resize). */
  setLayouts: (updates: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  /** Répare les chevauchements existants (poussée vers le bas). */
  normalize: () => void;
  setConfig: (id: string, config: WidgetConfig) => void;
  /** Ajoute automatiquement les nouveaux widgets (flow-packing). */
  sync: (available: string[]) => void;
}

export const useDashboard = create<DashboardState>()(
  persist(
    (set) => ({
      instances: [],
      editing: false,
      known: [],

      toggleEdit: () => set((s) => ({ editing: !s.editing })),

      add: (gid) =>
        set((s) => {
          const e = widgetByGid(gid);
          if (!e) return s;
          const { w, h } = sizeOf(e.widget.size);
          const y = s.instances.length ? bottomY(s.instances) : 0;
          return {
            instances: [
              ...s.instances,
              { id: newId(), gid, x: 0, y, w, h, config: defaultConfig(e.widget) },
            ],
            known: s.known.includes(gid) ? s.known : [...s.known, gid],
          };
        }),

      removeInstance: (id) =>
        set((s) => ({ instances: s.instances.filter((i) => i.id !== id) })),

      setLayouts: (updates) =>
        set((s) => {
          const map = new Map(updates.map((u) => [u.id, u]));
          return {
            instances: s.instances.map((i) => {
              const u = map.get(i.id);
              return u ? { ...i, x: u.x, y: u.y, w: u.w, h: u.h } : i;
            }),
          };
        }),

      normalize: () =>
        set((s) => {
          const resolved = resolveCollisions(s.instances);
          const map = new Map(resolved.map((r) => [r.id, r]));
          return {
            instances: s.instances.map((i) => {
              const r = map.get(i.id);
              return r && r.y !== i.y ? { ...i, y: r.y } : i;
            }),
          };
        }),

      setConfig: (id, config) =>
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, config } : i,
          ),
        })),

      sync: (available) =>
        set((s) => {
          const fresh = available.filter((g) => !s.known.includes(g));
          if (fresh.length === 0) return s;
          const known = [...s.known, ...fresh];
          const added: WidgetInstance[] = [];
          let cx = 0;
          let cy = s.instances.length ? bottomY(s.instances) : 0;
          let rowH = 0;
          for (const gid of fresh) {
            const e = widgetByGid(gid);
            if (!e) continue;
            const { w, h } = sizeOf(e.widget.size);
            if (cx + w > COLS) {
              cx = 0;
              cy += rowH;
              rowH = 0;
            }
            added.push({
              id: newId(),
              gid,
              x: cx,
              y: cy,
              w,
              h,
              config: defaultConfig(e.widget),
            });
            cx += w;
            rowH = Math.max(rowH, h);
          }
          return { known, instances: [...s.instances, ...added] };
        }),
    }),
    {
      name: "dashboard",
      version: 3,
      storage: createJSONStorage(() => namespacedStorage("shell")),
      // Modèle changé (liste ordonnée → instances canvas) : on repart propre,
      // `sync` repeuplera le tableau avec tous les widgets disponibles.
      migrate: () => ({ instances: [], editing: false, known: [] }),
    },
  ),
);
