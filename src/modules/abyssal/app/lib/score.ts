/**
 * Scoring de **qualité de roll** — **pur**. Pour chaque attribut muté, on situe
 * la valeur rollée dans la plage possible [base×min, base×max] et on l'oriente
 * selon `highIsGood` → 0 (plancher) … 1 (god-roll).
 */
import { MUTAPLASMIDS } from "../data/mutaplasmids";
import { ATTR_META } from "../data/attrmeta";
import type { AttrScore, RangeRow, RollScore } from "./types";

/** Score un module rollé à partir des attributs de base et rollés. */
export function scoreRoll(
  mutatorTypeId: number,
  baseTypeId: number,
  resultTypeId: number,
  baseAttrs: Record<number, number>,
  rolledAttrs: Record<number, number>,
): RollScore | null {
  const muta = MUTAPLASMIDS[mutatorTypeId];
  if (!muta) return null;

  const attrs: AttrScore[] = [];
  for (const [aidStr, range] of Object.entries(muta.attrs)) {
    const aid = Number(aidStr);
    const base = baseAttrs[aid];
    const rolled = rolledAttrs[aid];
    if (base == null || rolled == null) continue;
    const lo = base * range[0];
    const hi = base * range[1];
    const span = hi - lo;
    const meta = ATTR_META[aid] ?? { name: `attr ${aid}`, high: true, unit: 0 };
    const frac = span !== 0 ? (rolled - lo) / span : 0.5; // 0 = min, 1 = max
    const quality = clamp01(meta.high ? frac : 1 - frac);
    attrs.push({
      attrId: aid,
      name: meta.name,
      high: meta.high,
      unit: meta.unit,
      base,
      rolled,
      min: lo,
      max: hi,
      quality,
      pctVsBase: base !== 0 ? (rolled / base - 1) * 100 : 0,
    });
  }
  attrs.sort((a, b) => b.quality - a.quality);
  const overall = attrs.length ? attrs.reduce((s, a) => s + a.quality, 0) / attrs.length : 0;
  return { mutatorTypeId, baseTypeId, resultTypeId, attrs, overall };
}

/** Plages possibles (mode explorateur) pour un mutaplasmide + module de base. */
export function rangesFor(mutatorTypeId: number, baseAttrs: Record<number, number>): RangeRow[] {
  const muta = MUTAPLASMIDS[mutatorTypeId];
  if (!muta) return [];
  const rows: RangeRow[] = [];
  for (const [aidStr, range] of Object.entries(muta.attrs)) {
    const aid = Number(aidStr);
    const base = baseAttrs[aid];
    if (base == null) continue;
    const meta = ATTR_META[aid] ?? { name: `attr ${aid}`, high: true, unit: 0 };
    rows.push({ attrId: aid, name: meta.name, high: meta.high, unit: meta.unit, base, min: base * range[0], max: base * range[1] });
  }
  return rows;
}

/** Plage d'un tier sur l'échelle d'un attribut (multiplicateur ou absolu). */
export interface TierBar {
  tierId: number;
  min: number;
  max: number;
}

/** Ligne comparative d'un attribut entre tiers (échelle partagée). */
export interface CompareRow {
  attrId: number;
  name: string;
  high: boolean;
  unit: number;
  /** Valeur de base (absolue) si un module de base est fourni. */
  base?: number;
  /** Marqueur « base » sur l'échelle (1× en multiplicateur, ou valeur de base). */
  baseMark: number;
  domainMin: number;
  domainMax: number;
  bars: TierBar[];
}

interface TierLike {
  id: number;
  attrs: Record<number, [number, number]>;
}

/**
 * Construit la vue **comparative** des plages entre tiers, par attribut, sur une
 * échelle partagée. En multiplicateurs par défaut ; en valeurs **absolues** si
 * `baseAttrs` est fourni (base × mult).
 */
export function compareTiers(tiers: TierLike[], baseAttrs?: Record<number, number>): CompareRow[] {
  const attrIds = new Set<number>();
  for (const t of tiers) for (const a of Object.keys(t.attrs)) attrIds.add(Number(a));

  const rows: CompareRow[] = [];
  for (const aid of attrIds) {
    const meta = ATTR_META[aid] ?? { name: `attr ${aid}`, high: true, unit: 0 };
    const base = baseAttrs?.[aid];
    const baseMark = base != null ? base : 1;
    const bars: TierBar[] = [];
    let lo = baseMark;
    let hi = baseMark;
    for (const t of tiers) {
      const range = t.attrs[aid];
      if (!range) continue;
      const min = base != null ? base * range[0] : range[0];
      const max = base != null ? base * range[1] : range[1];
      bars.push({ tierId: t.id, min, max });
      lo = Math.min(lo, min);
      hi = Math.max(hi, max);
    }
    if (!bars.length) continue;
    const pad = (hi - lo) * 0.05 || Math.abs(baseMark) * 0.05 || 0.05;
    rows.push({
      attrId: aid,
      name: meta.name,
      high: meta.high,
      unit: meta.unit,
      base,
      baseMark,
      domainMin: lo - pad,
      domainMax: hi + pad,
      bars,
    });
  }
  // Attributs « bénéfiques » d'abord, puis par nom.
  rows.sort((a, b) => Number(b.high) - Number(a.high) || a.name.localeCompare(b.name));
  return rows;
}

/** Code de qualité stable (clé i18n) + ton (couleur) d'un roll global. */
export type QualityCode = "godroll" | "excellent" | "correct" | "poor" | "bad";

/**
 * Qualité d'un roll global : renvoie un **code stable** (traduit en composant
 * via `t("abyssal.quality." + code)`) et un ton (couleur). Pas de libellé brut.
 */
export function qualityLabel(overall: number): { code: QualityCode; tone: string } {
  if (overall >= 0.85) return { code: "godroll", tone: "text-success" };
  if (overall >= 0.65) return { code: "excellent", tone: "text-success" };
  if (overall >= 0.45) return { code: "correct", tone: "text-amber-300" };
  if (overall >= 0.25) return { code: "poor", tone: "text-amber-400" };
  return { code: "bad", tone: "text-destructive" };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
