/**
 * Calculs du Journal d'Activité — **purs** (testables au Node) : totaux d'une
 * session (ISK/heure, net, par run) et calculateur de **taux de drop** agrégé
 * sur plusieurs sessions.
 */
import type { DropRow, Entry, LootLine, PriceBasis, Session, Totals } from "./types";

/** Valeur unitaire d'une ligne de butin selon la base de prix choisie. */
export function unitValue(l: LootLine, basis: PriceBasis): number {
  return basis === "buy" ? l.unitBuy : l.unitSell;
}

const sumEntries = (e: Entry[]): number => e.reduce((s, x) => s + (Number.isFinite(x.isk) ? x.isk : 0), 0);

/** Totaux d'une session (durée en secondes). */
export function computeTotals(
  loot: LootLine[],
  income: Entry[],
  costs: Entry[],
  durationSec: number,
  runs: number,
  basis: PriceBasis,
): Totals {
  const lootValue = loot.reduce((s, l) => s + l.qty * unitValue(l, basis), 0);
  const inc = sumEntries(income);
  const cost = sumEntries(costs);
  const gross = lootValue + inc;
  const net = gross - cost;
  const hours = durationSec / 3600;
  const effRuns = runs > 0 ? runs : 1;
  return {
    lootValue,
    income: inc,
    costs: cost,
    gross,
    net,
    hours,
    iskPerHour: hours > 0 ? net / hours : 0,
    netPerRun: net / effRuns,
  };
}

/** Durée effective d'une session active (chrono mural). */
export function draftSeconds(accumulatedSec: number, runningSince: number | null, now: number): number {
  return accumulatedSec + (runningSince != null ? Math.max(0, (now - runningSince) / 1000) : 0);
}

/**
 * Calculateur de **taux de drop** : agrège le butin de sessions (déjà filtrées
 * par activité/site) → quantité moyenne par run, valeur par run, fréquence
 * d'apparition. Trié par valeur/run décroissante.
 */
export function dropRates(sessions: Session[], basis: PriceBasis): { rows: DropRow[]; totalRuns: number } {
  const totalRuns = sessions.reduce((s, x) => s + Math.max(1, x.runs), 0);
  const agg = new Map<number, { name: string; qty: number; appeared: number; unitBuy: number; unitSell: number }>();
  for (const s of sessions) {
    const seen = new Set<number>();
    for (const l of s.loot) {
      let a = agg.get(l.typeId);
      if (!a) {
        a = { name: l.name, qty: 0, appeared: 0, unitBuy: l.unitBuy, unitSell: l.unitSell };
        agg.set(l.typeId, a);
      }
      a.qty += l.qty;
      a.unitBuy = l.unitBuy; // dernière cotation connue
      a.unitSell = l.unitSell;
      if (!seen.has(l.typeId)) {
        a.appeared += 1;
        seen.add(l.typeId);
      }
    }
  }
  const n = sessions.length || 1;
  const rows: DropRow[] = [...agg.entries()].map(([typeId, a]) => {
    const perRun = totalRuns > 0 ? a.qty / totalRuns : 0;
    const unit = basis === "buy" ? a.unitBuy : a.unitSell;
    return {
      typeId,
      name: a.name,
      totalQty: a.qty,
      perRun,
      valuePerRun: perRun * unit,
      appeared: a.appeared,
      appearedPct: a.appeared / n,
    };
  });
  rows.sort((x, y) => y.valuePerRun - x.valuePerRun);
  return { rows, totalRuns };
}

/** Agrège plusieurs LootLines (somme des quantités par type). */
export function mergeLoot(existing: LootLine[], add: LootLine[]): LootLine[] {
  const map = new Map<number, LootLine>(existing.map((l) => [l.typeId, { ...l }]));
  for (const l of add) {
    const cur = map.get(l.typeId);
    if (cur) {
      cur.qty += l.qty;
      cur.unitBuy = l.unitBuy;
      cur.unitSell = l.unitSell;
    } else {
      map.set(l.typeId, { ...l });
    }
  }
  return [...map.values()];
}
