/**
 * Moteur de points de compétence (SP) et de temps d'entraînement EVE Online.
 *
 * Formules **officielles** :
 * - SP cumulés pour atteindre le niveau L d'une compétence de rang R :
 *     SP(L) = round(250 · R · 2^(2.5·(L−1)))   (L1=250·R, L2=1414·R, …, L5=256000·R)
 * - Vitesse d'entraînement :
 *     Omega : SP/min = primaire + 0.5 · secondaire
 *     Alpha : SP/min = 0.5 · primaire + 0.25 · secondaire
 *   où primaire/secondaire = valeur d'attribut **effective** (base remap + implant).
 */
import type { Attr } from "../data/skills";

export type AttrSet = Record<Attr, number>;

export const ATTRS: Attr[] = ["int", "mem", "per", "will", "cha"];

export const ATTR_LABEL: Record<Attr, string> = {
  int: "Intelligence",
  mem: "Memory",
  per: "Perception",
  will: "Willpower",
  cha: "Charisma",
};

/** Attributs de base d'un personnage neuf (Int/Per/Will/Mem 20, Cha 19 → somme 99). */
export const BASE_ATTRS: AttrSet = {
  int: 20,
  per: 20,
  will: 20,
  mem: 20,
  cha: 19,
};

/** Contraintes de remap : chaque attribut ∈ [17, 27], somme = 99 (14 pts répartissables). */
export const ATTR_MIN = 17;
export const ATTR_MAX = 27;
export const ATTR_TOTAL = 99;
export const REMAP_POINTS = ATTR_TOTAL - ATTR_MIN * ATTRS.length; // 14
export const IMPLANT_MAX = 5;

/** SP cumulés pour atteindre le niveau `level` (0–5) d'une compétence de rang `rank`. */
export function spToReach(level: number, rank: number): number {
  if (level <= 0) return 0;
  const l = Math.min(5, level);
  return Math.round(250 * rank * Math.pow(2, 2.5 * (l - 1)));
}

/** SP à entraîner pour passer de `from` à `to` (rang `rank`). */
export function spBetween(from: number, to: number, rank: number): number {
  return Math.max(0, spToReach(to, rank) - spToReach(from, rank));
}

/** SP par minute pour une paire d'attributs effectifs. */
export function spPerMinute(
  primary: number,
  secondary: number,
  alpha = false,
): number {
  return alpha
    ? 0.5 * primary + 0.25 * secondary
    : primary + 0.5 * secondary;
}

/** Attributs effectifs = base (remap) + implants. */
export function effective(base: AttrSet, implants: AttrSet): AttrSet {
  return {
    int: base.int + implants.int,
    mem: base.mem + implants.mem,
    per: base.per + implants.per,
    will: base.will + implants.will,
    cha: base.cha + implants.cha,
  };
}

export const ZERO_IMPLANTS: AttrSet = {
  int: 0,
  mem: 0,
  per: 0,
  will: 0,
  cha: 0,
};
