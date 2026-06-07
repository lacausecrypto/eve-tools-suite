/** Orchestration des scans (UI mince) : station-trading & arbitrage. */
import {
  fetchDailyVolume,
  fetchNames,
  fetchReferencePrices,
  fetchTypeAtStation,
  fetchTypeMeta,
  jumpsBetween,
  resolveTypeNames,
  scanStation,
  scanStationLadders,
  stationSystem,
  type ScanToken,
} from "./api";
import {
  DEFAULT_STATION_PARAMS,
  finalizeStation,
  rankStation,
  sortArbitrage,
  sortByExpectedProfit,
  type ArbitrageSort,
  type StationParams,
} from "./lib/scan";
import { matchRelist, matchToBuyOrders, type MatchResult } from "./lib/depth";
import { HUB_LIST } from "./lib/hubs";
import type { StationLadders } from "./api";
import type { BasketLine } from "./lib/multibuy";
import type {
  ArbitrageDeal,
  FeeConfig,
  Hub,
  SellStrategy,
  StationDeal,
} from "./lib/types";

export interface Progress {
  label: string;
  frac: number; // 0..1
}

const ENRICH_TOP = 60; // candidats enrichis par l'historique
const ENRICH_CONCURRENCY = 10;
const ARB_CONCURRENCY = 10;

/** Scan complet de station-trading sur un hub. */
export async function runStationScan(
  hub: Hub,
  params: StationParams,
  fees: FeeConfig,
  onProgress: (p: Progress) => void,
  token: ScanToken,
): Promise<StationDeal[]> {
  onProgress({ label: "Prix de référence…", frac: 0.02 });
  const prices = await fetchReferencePrices();

  const aggs = await scanStation(
    hub.region,
    hub.station,
    (done, total) =>
      onProgress({
        label: `Balayage du carnet… ${done}/${total} pages`,
        frac: 0.05 + 0.7 * (total ? done / total : 0),
      }),
    token,
  );
  if (token.cancelled) return [];

  const pre = rankStation(aggs, prices, fees, params);

  // Enrichissement historique des meilleurs candidats (volume quotidien réel).
  const top = pre.slice(0, ENRICH_TOP);
  let done = 0;
  const finalized: StationDeal[] = [];
  await pool(top, ENRICH_CONCURRENCY, async (deal) => {
    if (token.cancelled) return;
    const vol = await fetchDailyVolume(hub.region, deal.typeId);
    finalized.push(finalizeStation(deal, vol, fees, params));
    onProgress({
      label: `Liquidité… ${++done}/${top.length}`,
      frac: 0.75 + 0.18 * (done / top.length),
    });
  });
  if (token.cancelled) return [];

  onProgress({ label: "Résolution des noms…", frac: 0.95 });
  const names = await fetchNames(finalized.map((d) => d.typeId));
  for (const d of finalized) d.name = names.get(d.typeId) ?? d.name;

  onProgress({ label: "Terminé", frac: 1 });
  return sortByExpectedProfit(finalized);
}

export interface ArbitrageResult {
  deals: ArbitrageDeal[];
  jumps: number | null;
}


/** Cap d'enrichissement (meta/noms) — borne les appels après l'appariement. */
const MAX_BULK_DEALS = 400;

/**
 * Arbitrage **full-market** : balaie **une fois** le carnet complet des deux hubs
 * (ladders par type), puis apparie **tous** les objets présents des deux côtés
 * **en mémoire** (profondeur-aware). Couvre l'intégralité du marché (~10 000+
 * objets) avec 2 balayages région, là où l'approche par candidats refaisait
 * 2 appels par objet (et plafonnait à ~150). Seuls les meilleurs deals sont
 * enrichis (m³ + nom), ce qui borne les appels finaux.
 */
export async function runBulkArbitrage(
  src: Hub,
  dst: Hub,
  strategy: SellStrategy,
  sortBy: ArbitrageSort,
  params: StationParams,
  fees: FeeConfig,
  onProgress: (p: Progress) => void,
  token: ScanToken,
): Promise<ArbitrageResult> {
  // 1. Balaye les deux régions (ladders) — un seul scan chacun.
  const srcL = await scanStationLadders(
    src.region,
    src.station,
    (d, t) => onProgress({ label: `Balayage ${src.label}… ${d}/${t}`, frac: 0.02 + 0.4 * (t ? d / t : 0) }),
    token,
  );
  if (token.cancelled) return { deals: [], jumps: null };
  const dstL = await scanStationLadders(
    dst.region,
    dst.station,
    (d, t) => onProgress({ label: `Balayage ${dst.label}… ${d}/${t}`, frac: 0.44 + 0.4 * (t ? d / t : 0) }),
    token,
  );
  if (token.cancelled) return { deals: [], jumps: null };

  // 2. Route (sauts).
  const [sa, da] = await Promise.all([stationSystem(src.station), stationSystem(dst.station)]);
  const jumps = sa != null && da != null ? await jumpsBetween(sa, da) : null;

  // 3. Appariement en mémoire de TOUS les types présents des deux côtés.
  onProgress({ label: "Appariement du marché…", frac: 0.86 });
  const broker = fees.brokerFeePct / 100;
  const tax = fees.salesTaxPct / 100;
  interface Raw {
    typeId: number;
    match: MatchResult;
    srcSellMin: number;
    dstBuyMax: number | null;
    dstSellMin: number | null;
    srcSellVol: number;
    dstBuyVol: number;
    totalNet: number;
    roiPct: number;
  }
  const raw: Raw[] = [];
  for (const [typeId, s] of srcL) {
    if (!s.sells.length) continue;
    const d = dstL.get(typeId);
    if (!d) continue;
    const srcSellMin = s.sells[0].price;
    if (params.minPrice && srcSellMin < params.minPrice) continue;
    if (params.maxPrice && srcSellMin > params.maxPrice) continue;

    const match =
      strategy === "buyOrders"
        ? matchToBuyOrders(s.sells, d.buys, tax, params.budget)
        : matchRelist(s.sells, (d.sells[0]?.price ?? 0) * (1 - broker - tax), params.budget);
    if (match.qty <= 0) continue;
    const totalNet = match.revenue - match.cost;
    if (totalNet <= 0) continue;
    const roiPct = match.cost > 0 ? (totalNet / match.cost) * 100 : 0;
    if (roiPct < params.minMarginPct) continue;

    raw.push({
      typeId,
      match,
      srcSellMin,
      dstBuyMax: d.buys[0]?.price ?? null,
      dstSellMin: d.sells[0]?.price ?? null,
      srcSellVol: s.sells.reduce((x, l) => x + l.vol, 0),
      dstBuyVol: d.buys.reduce((x, l) => x + l.vol, 0),
      totalNet,
      roiPct,
    });
  }

  // 4. Enrichissement borné (m³ + nom) des meilleurs deals.
  raw.sort((a, b) => b.totalNet - a.totalNet);
  const capped = raw.slice(0, MAX_BULK_DEALS);
  let done = 0;
  const deals: ArbitrageDeal[] = [];
  await pool(capped, ARB_CONCURRENCY, async (r) => {
    if (token.cancelled) return;
    let pv = 0;
    let name = `#${r.typeId}`;
    try {
      const m = await fetchTypeMeta(r.typeId);
      pv = m.packagedVolume || 0;
      name = m.name;
    } catch {
      /* nom/volume indisponibles */
    }
    const netPerUnit = r.totalNet / r.match.qty;
    deals.push({
      typeId: r.typeId,
      name,
      srcSell: r.srcSellMin,
      dstBuy: r.dstBuyMax,
      dstSell: r.dstSellMin,
      effSrc: r.match.cost / r.match.qty,
      effDst: r.match.revenue / r.match.qty,
      packagedVolume: pv,
      refPrice: null,
      netPerUnit,
      netPerM3: pv > 0 ? netPerUnit / pv : 0,
      roiPct: r.roiPct,
      feasibleQty: r.match.qty,
      totalNet: r.totalNet,
      srcSellVol: r.srcSellVol,
      dstBuyVol: r.dstBuyVol,
    });
    onProgress({
      label: `Enrichissement… ${++done}/${capped.length}`,
      frac: 0.9 + 0.09 * (capped.length ? done / capped.length : 0),
    });
  });

  onProgress({ label: "Terminé", frac: 1 });
  return { deals: sortArbitrage(deals, sortBy), jumps };
}

// ————————————————————————————————————————————————————————————————
// Arbitrage GLOBAL : tous les hubs × tous les items
// ————————————————————————————————————————————————————————————————

/** Deal d'arbitrage global : porte le hub d'achat, de revente et les sauts. */
export interface AllHubsDeal extends ArbitrageDeal {
  srcHubId: string;
  srcLabel: string;
  dstHubId: string;
  dstLabel: string;
  jumps: number | null;
}

export interface AllHubsResult {
  deals: AllHubsDeal[];
}

/**
 * Arbitrage **tous hubs × tous items** : balaie **une fois** le carnet de chaque
 * hub majeur, puis pour **chaque objet** présent dans ≥2 hubs cherche la **meilleure
 * route** — hub d'achat le moins cher → hub de revente le plus rentable —
 * profondeur-aware et frais déduits. Couvre l'intégralité du marché inter-hubs en
 * `N` balayages région (N = nombre de hubs), tout en mémoire ensuite.
 */
export async function runAllHubsArbitrage(
  strategy: SellStrategy,
  sortBy: ArbitrageSort,
  params: StationParams,
  fees: FeeConfig,
  onProgress: (p: Progress) => void,
  token: ScanToken,
): Promise<AllHubsResult> {
  const N = HUB_LIST.length;
  // 1. Balaye chaque hub (ladders).
  const ladders: { hub: (typeof HUB_LIST)[number]; L: StationLadders }[] = [];
  for (let i = 0; i < N; i++) {
    const hub = HUB_LIST[i];
    const L = await scanStationLadders(
      hub.region,
      hub.station,
      (d, t) =>
        onProgress({
          label: `Balayage ${hub.label}… ${d}/${t}`,
          frac: 0.01 + 0.76 * ((i + (t ? d / t : 0)) / N),
        }),
      token,
    );
    if (token.cancelled) return { deals: [] };
    ladders.push({ hub, L });
  }

  // 2. Sauts entre toutes les paires de hubs (résolu une fois, caché).
  onProgress({ label: "Calcul des routes…", frac: 0.79 });
  const sysOf = new Map<string, number | null>();
  for (const { hub } of ladders) sysOf.set(hub.id, await stationSystem(hub.station));
  const jumpsByPair = new Map<string, number | null>();
  for (const a of ladders)
    for (const b of ladders) {
      if (a.hub.id === b.hub.id) continue;
      const sa = sysOf.get(a.hub.id);
      const sb = sysOf.get(b.hub.id);
      jumpsByPair.set(
        `${a.hub.id}>${b.hub.id}`,
        sa != null && sb != null ? await jumpsBetween(sa, sb) : null,
      );
    }

  // 3. Appariement : meilleure route par objet (toutes paires de hubs).
  onProgress({ label: "Appariement du marché…", frac: 0.82 });
  const broker = fees.brokerFeePct / 100;
  const tax = fees.salesTaxPct / 100;

  const allTypeIds = new Set<number>();
  for (const { L } of ladders) for (const id of L.keys()) allTypeIds.add(id);

  interface BestRaw {
    typeId: number;
    src: (typeof ladders)[number];
    dst: (typeof ladders)[number];
    match: MatchResult;
    srcSellMin: number;
    dstBuyMax: number | null;
    dstSellMin: number | null;
    srcSellVol: number;
    dstBuyVol: number;
    totalNet: number;
    roiPct: number;
  }
  const raw: BestRaw[] = [];

  for (const typeId of allTypeIds) {
    const having = ladders.filter((h) => h.L.has(typeId));
    if (having.length < 2) continue;

    let best: BestRaw | null = null;
    for (const src of having) {
      const s = src.L.get(typeId)!;
      if (!s.sells.length) continue;
      const srcSellMin = s.sells[0].price;
      if (params.minPrice && srcSellMin < params.minPrice) continue;
      if (params.maxPrice && srcSellMin > params.maxPrice) continue;

      for (const dst of having) {
        if (dst.hub.id === src.hub.id) continue;
        const d = dst.L.get(typeId)!;
        let match: MatchResult;
        if (strategy === "buyOrders") {
          const dstBuyMax = d.buys[0]?.price ?? null;
          if (dstBuyMax == null || dstBuyMax * (1 - tax) <= srcSellMin) continue; // prune
          match = matchToBuyOrders(s.sells, d.buys, tax, params.budget);
        } else {
          const dstSellMin = d.sells[0]?.price ?? null;
          if (dstSellMin == null) continue;
          const listNet = dstSellMin * (1 - broker - tax);
          if (listNet <= srcSellMin) continue; // prune
          match = matchRelist(s.sells, listNet, params.budget);
        }
        if (match.qty <= 0) continue;
        const totalNet = match.revenue - match.cost;
        if (totalNet <= 0) continue;
        const roiPct = match.cost > 0 ? (totalNet / match.cost) * 100 : 0;
        if (roiPct < params.minMarginPct) continue;

        if (!best || totalNet > best.totalNet) {
          best = {
            typeId,
            src,
            dst,
            match,
            srcSellMin,
            dstBuyMax: d.buys[0]?.price ?? null,
            dstSellMin: d.sells[0]?.price ?? null,
            srcSellVol: s.sells.reduce((x, l) => x + l.vol, 0),
            dstBuyVol: d.buys.reduce((x, l) => x + l.vol, 0),
            totalNet,
            roiPct,
          };
        }
      }
    }
    if (best) raw.push(best);
  }

  // 4. Enrichissement borné (m³ + nom) des meilleurs deals.
  raw.sort((a, b) => b.totalNet - a.totalNet);
  const capped = raw.slice(0, MAX_BULK_DEALS);
  let done = 0;
  const deals: AllHubsDeal[] = [];
  await pool(capped, ARB_CONCURRENCY, async (r) => {
    if (token.cancelled) return;
    let pv = 0;
    let name = `#${r.typeId}`;
    try {
      const m = await fetchTypeMeta(r.typeId);
      pv = m.packagedVolume || 0;
      name = m.name;
    } catch {
      /* indisponible */
    }
    const netPerUnit = r.totalNet / r.match.qty;
    deals.push({
      typeId: r.typeId,
      name,
      srcSell: r.srcSellMin,
      dstBuy: r.dstBuyMax,
      dstSell: r.dstSellMin,
      effSrc: r.match.cost / r.match.qty,
      effDst: r.match.revenue / r.match.qty,
      packagedVolume: pv,
      refPrice: null,
      netPerUnit,
      netPerM3: pv > 0 ? netPerUnit / pv : 0,
      roiPct: r.roiPct,
      feasibleQty: r.match.qty,
      totalNet: r.totalNet,
      srcSellVol: r.srcSellVol,
      dstBuyVol: r.dstBuyVol,
      srcHubId: r.src.hub.id,
      srcLabel: r.src.hub.label,
      dstHubId: r.dst.hub.id,
      dstLabel: r.dst.hub.label,
      jumps: jumpsByPair.get(`${r.src.hub.id}>${r.dst.hub.id}`) ?? null,
    });
    onProgress({
      label: `Enrichissement… ${++done}/${capped.length}`,
      frac: 0.9 + 0.09 * (capped.length ? done / capped.length : 0),
    });
  });

  onProgress({ label: "Terminé", frac: 1 });
  return { deals: sortArbitrage(deals, sortBy) as AllHubsDeal[] };
}

/**
 * Matrice de sauts entre **tous les hubs** (clé `"<src>><dst>"`), pour le
 * planificateur d'itinéraire. `secure` privilégie la route haute-sécurité.
 * Résolu une fois (systèmes + routes cachés).
 */
export async function hubPairJumps(secure: boolean): Promise<Map<string, number | null>> {
  const sysOf = new Map<string, number | null>();
  for (const h of HUB_LIST) sysOf.set(h.id, await stationSystem(h.station));
  const out = new Map<string, number | null>();
  for (const a of HUB_LIST)
    for (const b of HUB_LIST) {
      if (a.id === b.id) {
        out.set(`${a.id}>${b.id}`, 0);
        continue;
      }
      const sa = sysOf.get(a.id);
      const sb = sysOf.get(b.id);
      out.set(
        `${a.id}>${b.id}`,
        sa != null && sb != null ? await jumpsBetween(sa, sb, secure) : null,
      );
    }
  return out;
}

// ————————————————————————————————————————————————————————————————
// Multibuy transverse (panier)
// ————————————————————————————————————————————————————————————————

export interface PricedLine {
  typeId: number;
  name: string;
  qty: number;
  sellMin: number | null; // prix d'achat unitaire (sell min)
  buyMax: number | null; // meilleur achat unitaire (buy max)
  packagedVolume: number;
  buyCost: number | null; // coût d'achat total (sell min × qté)
  sellValue: number | null; // valeur de revente nette (buy max × (1−taxe) × qté)
  volume: number; // m³ total
}

export interface BasketResult {
  hub: Hub;
  lines: PricedLine[];
  unresolved: string[];
  totalBuy: number; // somme des coûts d'achat (lignes cotées)
  totalSell: number; // somme des valeurs de revente nettes
  totalVolume: number; // m³ total
  missingBuy: number; // lignes sans prix de vente (non achetables ici)
}

const ARB_LIKE_CONCURRENCY = 10;

/** Évalue un panier à un hub : coût d'achat, valeur de revente nette, m³. */
export async function runMultibuy(
  hub: Hub,
  basket: BasketLine[],
  fees: FeeConfig,
  onProgress: (p: Progress) => void,
  token: ScanToken,
): Promise<BasketResult> {
  onProgress({ label: "Résolution des objets…", frac: 0.04 });
  const resolved = await resolveTypeNames(basket.map((b) => b.name));
  const idByName = new Map(resolved.map((r) => [r.name.toLowerCase(), r]));

  const tax = fees.salesTaxPct / 100;
  const lines: PricedLine[] = [];
  const unresolved: string[] = [];

  const jobs = basket
    .map((b) => ({ b, hit: idByName.get(b.name.toLowerCase()) }))
    .filter((j) => {
      if (!j.hit) {
        unresolved.push(j.b.name);
        return false;
      }
      return true;
    });

  let done = 0;
  await pool(jobs, ARB_LIKE_CONCURRENCY, async ({ b, hit }) => {
    if (token.cancelled || !hit) return;
    try {
      const [q, meta] = await Promise.all([
        fetchTypeAtStation(hub.region, hub.station, hit.id),
        fetchTypeMeta(hit.id),
      ]);
      const buyCost = q.sellMin != null ? q.sellMin * b.qty : null;
      const sellValue = q.buyMax != null ? q.buyMax * (1 - tax) * b.qty : null;
      lines.push({
        typeId: hit.id,
        name: hit.name,
        qty: b.qty,
        sellMin: q.sellMin,
        buyMax: q.buyMax,
        packagedVolume: meta.packagedVolume,
        buyCost,
        sellValue,
        volume: meta.packagedVolume * b.qty,
      });
    } catch {
      unresolved.push(b.name);
    } finally {
      onProgress({
        label: `Évaluation… ${++done}/${jobs.length}`,
        frac: 0.1 + 0.88 * (jobs.length ? done / jobs.length : 0),
      });
    }
  });

  lines.sort((a, b) => (b.buyCost ?? 0) - (a.buyCost ?? 0));
  const totalBuy = lines.reduce((s, l) => s + (l.buyCost ?? 0), 0);
  const totalSell = lines.reduce((s, l) => s + (l.sellValue ?? 0), 0);
  const totalVolume = lines.reduce((s, l) => s + l.volume, 0);
  const missingBuy = lines.filter((l) => l.buyCost == null).length;

  onProgress({ label: "Terminé", frac: 1 });
  return { hub, lines, unresolved, totalBuy, totalSell, totalVolume, missingBuy };
}

export interface HubComparison {
  hubId: string;
  label: string;
  totalBuy: number;
  missing: number;
}

/** Compare le **coût d'achat** d'un panier sur plusieurs hubs (le moins cher gagne). */
export async function runBasketCompare(
  hubs: Hub[],
  basket: BasketLine[],
  onProgress: (p: Progress) => void,
  token: ScanToken,
): Promise<HubComparison[]> {
  const resolved = await resolveTypeNames(basket.map((b) => b.name));
  const idByName = new Map(resolved.map((r) => [r.name.toLowerCase(), r]));
  const jobs = basket
    .map((b) => ({ qty: b.qty, hit: idByName.get(b.name.toLowerCase()) }))
    .filter((j) => j.hit) as { qty: number; hit: { id: number; name: string } }[];

  const out: HubComparison[] = [];
  let done = 0;
  const totalSteps = hubs.length * jobs.length || 1;
  for (const hub of hubs) {
    if (token.cancelled) break;
    let totalBuy = 0;
    let missing = 0;
    await pool(jobs, ARB_LIKE_CONCURRENCY, async ({ qty, hit }) => {
      if (token.cancelled) return;
      try {
        const q = await fetchTypeAtStation(hub.region, hub.station, hit.id);
        if (q.sellMin != null) totalBuy += q.sellMin * qty;
        else missing += 1;
      } catch {
        missing += 1;
      } finally {
        onProgress({
          label: `Comparaison ${hub.label}…`,
          frac: Math.min(0.99, ++done / totalSteps),
        });
      }
    });
    out.push({ hubId: hub.id, label: hub.label, totalBuy, missing });
  }
  out.sort((a, b) => a.totalBuy - b.totalBuy);
  onProgress({ label: "Terminé", frac: 1 });
  return out;
}

/** Pool de concurrence générique. */
async function pool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

export { DEFAULT_STATION_PARAMS };
