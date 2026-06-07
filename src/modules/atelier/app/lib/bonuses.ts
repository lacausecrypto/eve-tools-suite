/**
 * Bonus de vaisseau — convertit les traits **réels** du SDE (`data/hulls.ts`) en
 * multiplicateurs applicables (DPS, résonance, PV) à un niveau de compétence
 * donné. Distingue bonus de **rôle** (forfaitaire, ×1) et bonus par **niveau**
 * (×niveau).
 */
import { HULL_BONUS } from "../data/hulls";
import type { WeaponSystem } from "../data/catalog";
import type { HullBonus, HullBonusNote } from "./types";

/** Facteur de cadence (réduction du temps de cycle) → multiplicateur de DPS. */
function rofFactor(pct: number | undefined, levels: number): number {
  const r = (pct ?? 0) * levels;
  return r > 0 && r < 100 ? 1 / (1 - r / 100) : 1;
}

/** Système d'arme bonusé par la vaisseau (pour le choix « auto »), si connu. */
export function bonusWeapon(hullName: string): WeaponSystem | undefined {
  return HULL_BONUS[hullName.toLowerCase()]?.weapon;
}

/** Couche de tank bonusée par la vaisseau (résist ou PV), si connue. */
export function bonusTankLayer(hullName: string): "armor" | "shield" | undefined {
  const b = HULL_BONUS[hullName.toLowerCase()];
  return b?.layer ?? b?.hpLayer;
}

/**
 * Multiplicateurs de bonus de vaisseau à `level` (5 = niveau V). `null` si la vaisseau
 * n'a aucun trait pertinent connu.
 */
export function hullBonusFor(hullName: string, level = 5): HullBonus | null {
  const b = HULL_BONUS[hullName.toLowerCase()];
  if (!b) return null;

  const dpsMult =
    (1 + (b.dmgRole ?? 0) / 100) *
    (1 + (b.dmgPerLvl ?? 0) * level / 100) *
    rofFactor(b.rofRole, 1) *
    rofFactor(b.rofPerLvl, level);

  const resoMult = Math.max(
    0.05,
    (1 - (b.resistRole ?? 0) / 100) * (1 - (b.resistPerLvl ?? 0) * level / 100),
  );
  const hpMult = (1 + (b.hpRole ?? 0) / 100) * (1 + (b.hpPerLvl ?? 0) * level / 100);

  const notes: HullBonusNote[] = [];
  if (dpsMult > 1.001 && b.weapon)
    notes.push({ type: "dps", pct: Math.round((dpsMult - 1) * 100), weapon: b.weapon });
  if (b.layer && resoMult < 0.999)
    notes.push({ type: "resist", pct: Math.round((1 - resoMult) * 100), layer: b.layer });
  if (b.hpLayer && hpMult > 1.001)
    notes.push({ type: "hp", pct: Math.round((hpMult - 1) * 100), layer: b.hpLayer });

  return {
    weapon: b.weapon,
    dpsMult,
    layer: b.layer,
    resoMult,
    hpLayer: b.hpLayer,
    hpMult,
    notes,
  };
}
