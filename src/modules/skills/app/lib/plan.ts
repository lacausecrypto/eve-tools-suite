/**
 * Plan d'entraînement : agrégation des compétences, SP totaux, et temps de
 * formation pour un jeu d'attributs donné.
 */
import { SKILLS, type Attr, type SkillDef } from "../data/skills";
import { effective, spBetween, spPerMinute, type AttrSet } from "./sp";

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export function skillById(id: number): SkillDef | undefined {
  return SKILL_BY_ID.get(id);
}

/** Une entrée de plan : entraîner `skillId` de `from` à `to`. */
export interface PlanItem {
  skillId: number;
  from: number;
  to: number;
}

export interface PlanRow {
  skill: SkillDef;
  from: number;
  to: number;
  sp: number;
}

export function planRows(items: PlanItem[]): PlanRow[] {
  const rows: PlanRow[] = [];
  for (const it of items) {
    const skill = SKILL_BY_ID.get(it.skillId);
    if (!skill) continue;
    rows.push({
      skill,
      from: it.from,
      to: it.to,
      sp: spBetween(it.from, it.to, skill.rank),
    });
  }
  return rows;
}

export function totalSp(rows: PlanRow[]): number {
  return rows.reduce((a, r) => a + r.sp, 0);
}

/** SP regroupés par paire d'attributs (primaire,secondaire). */
export function pairTotals(rows: PlanRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.sp <= 0) continue;
    const k = `${r.skill.p},${r.skill.s}`;
    m.set(k, (m.get(k) ?? 0) + r.sp);
  }
  return m;
}

/** Temps total du plan (secondes) pour des attributs de base + implants donnés. */
export function planSeconds(
  pairs: Map<string, number>,
  base: AttrSet,
  implants: AttrSet,
  alpha: boolean,
): number {
  const eff = effective(base, implants);
  let secs = 0;
  for (const [k, sp] of pairs) {
    const [p, s] = k.split(",") as [Attr, Attr];
    const perMin = spPerMinute(eff[p], eff[s], alpha);
    if (perMin > 0) secs += (sp / perMin) * 60;
  }
  return secs;
}
