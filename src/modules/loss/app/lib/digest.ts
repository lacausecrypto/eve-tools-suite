/**
 * Présentation & heuristiques du Loss Analyzer — **pur et testable**.
 *
 * Le backend fournit les faits (attaquants, dégâts, valeurs, fit). Ici on en
 * tire un format lisible et des **pistes** post-mortem. Ces pistes sont
 * volontairement heuristiques (détection de modules par nom, taille de gang) et
 * présentées comme telles — pas un verdict de simulateur type Pyfa.
 */
import { resistHole, type Damage } from "@/modules/ship-trainer/app/data/doctrine";
import { shipById } from "@/modules/ship-trainer/app/data/ships";
import type { FitModule, PostMortem } from "../api";

/** Formate un montant ISK de façon compacte (12.3M, 4.21B…). */
export function formatIsk(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return Math.round(n).toString();
}

/** Tous les modules fittés, tous emplacements confondus. */
export function allModules(pm: PostMortem): FitModule[] {
  const f = pm.fit;
  return [...f.high, ...f.mid, ...f.low, ...f.rig, ...f.drone];
}

/** Type ids des capsules (Capsule + Capsule Genolution). */
const POD_TYPE_IDS = new Set([670, 33328]);

/** Mots-clés (noms ESI anglais) repérant un module de tank. */
const TANK_KEYWORDS = [
  "Damage Control",
  "Hardener",
  "Extender",
  "Plate",
  "Membrane",
  "Bulkhead",
  "Repairer",
  "Shield Booster",
  "Invulnerability",
  "Reactive",
  "Resistance",
  "Ward",
  "Deflection",
  "Dissipation",
  "Dampening",
];

function matchesAny(name: string | null, keywords: string[]): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** Gravité d'une piste post-mortem (pilote le style). */
export type VerdictSeverity = "warn" | "info" | "good";

/** Une piste post-mortem : un code i18n + variables + gravité. */
export interface VerdictItem {
  code: string;
  severity: VerdictSeverity;
  vars?: Record<string, string | number>;
}

/** Est-ce une capsule (pod) ? */
export function isPod(pm: PostMortem): boolean {
  return (
    (pm.ship_type_id != null && POD_TYPE_IDS.has(pm.ship_type_id)) ||
    (pm.ship_name?.toLowerCase().startsWith("capsule") ?? false)
  );
}

/**
 * Trou de résistance naturel de la vaisseau de la victime — **factuel** quand la
 * vaisseau figure dans le dataset du Ship Trainer (sinon `null`). Synergie inter-modules.
 */
export function victimResistHole(
  pm: PostMortem,
): { tank: "Armor" | "Shield"; hole: Damage } | null {
  if (pm.ship_type_id == null) return null;
  const ship = shipById(pm.ship_type_id);
  if (!ship) return null;
  return { tank: ship.tank, hole: resistHole(ship.tank) };
}

/**
 * Construit les pistes post-mortem (« ce qui aurait pu sauver le fit »).
 * Ordonnées des plus actionnables aux informatives.
 */
export function buildVerdict(pm: PostMortem): VerdictItem[] {
  const out: VerdictItem[] = [];
  const mods = allModules(pm);
  const pod = isPod(pm);

  // Fit : tank.
  if (!pod) {
    if (mods.length === 0) {
      out.push({ code: "empty_fit", severity: "warn" });
    } else {
      const hasDamageControl = mods.some((m) => matchesAny(m.name, ["Damage Control"]));
      const hasTank = mods.some((m) => matchesAny(m.name, TANK_KEYWORDS));
      if (!hasTank) {
        out.push({ code: "no_tank", severity: "warn" });
      } else if (!hasDamageControl) {
        out.push({ code: "no_damage_control", severity: "info" });
      }
    }
  }

  // Composition du gang.
  if (pm.npc) {
    out.push({ code: "npc", severity: "info" });
  } else if (pm.gang_class === "blob" || pm.gang_class === "fleet") {
    out.push({ code: "outnumbered", severity: "info", vars: { n: pm.attacker_count } });
  } else if (pm.solo || pm.gang_class === "solo") {
    out.push({ code: "solo", severity: "info" });
  }

  // ISK : ce qui a survécu.
  if (pm.dropped_ratio >= 0.4 && pm.total_value > 0) {
    out.push({
      code: "high_drop",
      severity: "good",
      vars: { pct: Math.round(pm.dropped_ratio * 100) },
    });
  }

  // Pod.
  if (pod) {
    out.push({ code: "pod", severity: "info" });
  }

  return out;
}

/** Libellé d'emplacement (pour les colonnes de fit). */
export const SLOT_LABEL: Record<string, string> = {
  high: "loss.slot.high",
  mid: "loss.slot.mid",
  low: "loss.slot.low",
  rig: "loss.slot.rig",
  drone: "loss.slot.drone",
};
