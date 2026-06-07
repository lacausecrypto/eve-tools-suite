import type {
  LootEvent,
  Member,
  PayoutBasis,
  PlayerGroup,
  Session,
  SessionMember,
} from "@mining/types";
import { ORES_BY_ID, categoryForBase } from "@mining/data/ores";
import { isConsumable } from "@mining/data/consumables";
import { REPROCESS, MINERAL_ORDER } from "@mining/data/reprocess";
import { canonicalOreName } from "@mining/lib/lootParser";

// ───────────────────────── Identité joueur (alts) ─────────────────────────

export interface ResolvedPlayer {
  key: string; // clé d'agrégation stable (groupe ou membre)
  name: string; // nom affiché (nom du groupe si alts)
}

export interface PlayerResolver {
  resolve: (characterName: string) => ResolvedPlayer;
}

/**
 * Fabrique un résolveur nom-de-personnage → joueur réel, en tenant compte des
 * groupes d'alts. Un personnage groupé est rattaché à son groupe ; sinon à
 * lui-même.
 */
export function makePlayerResolver(
  members: Member[],
  groups: PlayerGroup[]
): PlayerResolver {
  const memberByName = new Map(members.map((m) => [m.name.toLowerCase(), m]));
  const groupOfMember = new Map<string, PlayerGroup>();
  for (const g of groups)
    for (const mid of g.memberIds) groupOfMember.set(mid, g);

  return {
    resolve(characterName: string): ResolvedPlayer {
      const m = memberByName.get(characterName.toLowerCase());
      const g = m ? groupOfMember.get(m.id) : undefined;
      if (g) return { key: `g:${g.id}`, name: g.name };
      if (m) return { key: `m:${m.id}`, name: m.name };
      return { key: `n:${characterName.toLowerCase()}`, name: characterName };
    },
  };
}

/** Un membre est actif si son dernier intervalle de présence est ouvert. */
export function isActive(m: SessionMember): boolean {
  const last = m.intervals[m.intervals.length - 1];
  return !!last && last.leftAt === null;
}

/** Temps de présence cumulé (ms). Les intervalles ouverts sont comptés jusqu'à `now`. */
export function activeMs(m: SessionMember, now: number): number {
  let total = 0;
  for (const iv of m.intervals) {
    const end = iv.leftAt ?? now;
    total += Math.max(0, end - iv.joinedAt);
  }
  return total;
}

/** Total des belts comptés sur la session (par type de gisement + hérité). */
export function totalBelts(s: Session): number {
  const fromTypes = Object.values(s.beltCounts ?? {}).reduce(
    (a, n) => a + n,
    0
  );
  const fromOres = (s.ores ?? []).reduce((a, o) => a + o.belts, 0);
  return fromTypes + fromOres;
}

export interface MemberShare {
  memberId: string;
  name: string;
  activeMs: number;
  active: boolean;
  sharePct: number; // 0..100
  isk: number;
}

/**
 * Répartition de l'ISK par membre, pondérée par le temps de présence.
 * Si aucun temps n'est cumulé, l'ISK est partagé équitablement.
 */
export function iskShares(s: Session, now: number): MemberShare[] {
  const reference = s.status === "ended" && s.endedAt ? s.endedAt : now;
  const rows = s.members.map((m) => ({
    member: m,
    ms: activeMs(m, reference),
  }));
  const totalMs = rows.reduce((a, r) => a + r.ms, 0);
  const n = rows.length || 1;

  return rows.map(({ member, ms }) => {
    const pct =
      totalMs > 0 ? (ms / totalMs) * 100 : s.members.length ? 100 / n : 0;
    return {
      memberId: member.memberId,
      name: member.name,
      activeMs: ms,
      active: isActive(member),
      sharePct: pct,
      isk: (pct / 100) * s.totalIsk,
    };
  });
}

/** Durée totale de la session (ms). */
export function sessionDurationMs(s: Session, now: number): number {
  const end = s.status === "ended" && s.endedAt ? s.endedAt : now;
  return Math.max(0, end - s.startedAt);
}

export interface OreBreakdownRow {
  oreId: string;
  name: string;
  category: string;
  belts: number;
}

export function oreBreakdown(s: Session): OreBreakdownRow[] {
  return s.ores
    .map((o) => {
      const ore = ORES_BY_ID[o.oreId];
      return {
        oreId: o.oreId,
        name: ore?.name ?? o.oreId,
        category: ore?.category ?? "—",
        belts: o.belts,
      };
    })
    .sort((a, b) => b.belts - a.belts);
}

// ───────────────────────── Récoltes (Diffusions) ─────────────────────────

export interface OreLine {
  ore: string; // nom canonique (grade inclus), ex : "Omber III-Grade"
  base: string;
  grade: number;
  category: string;
  qty: number;
  price: number; // ISK/unité
  value: number;
}

export interface MinerRow {
  miner: string;
  totalQty: number;
  value: number;
  byOre: OreLine[];
  sharePct: number;
}

/** Groupe de minerais par catégorie (pour l'affichage du tableau de prix). */
export interface OreGroup {
  category: string;
  ores: OreLine[];
  qty: number;
  value: number;
}

export interface MinedSummary {
  miners: MinerRow[];
  oreTotals: OreLine[];
  oreGroups: OreGroup[];
  totalQty: number;
  totalValue: number;
  hasPrices: boolean;
}

function oreKey(e: LootEvent): string {
  return e.ore ?? canonicalOreName(e.base, e.grade);
}

/** Agrège les événements de récolte par mineur et par minerai (grades séparés). */
export function minedSummary(s: Session): MinedSummary {
  const prices = s.orePrices ?? {};
  const events: LootEvent[] = s.lootEvents ?? [];

  const meta = new Map<string, { base: string; grade: number }>();
  const perMiner = new Map<string, Map<string, number>>();
  const oreQty = new Map<string, number>();

  for (const e of events) {
    const ore = oreKey(e);
    if (isConsumable(ore)) continue; // cristaux de minage : suivis à part
    if (!meta.has(ore)) meta.set(ore, { base: e.base, grade: e.grade });
    if (!perMiner.has(e.miner)) perMiner.set(e.miner, new Map());
    const m = perMiner.get(e.miner)!;
    m.set(ore, (m.get(ore) ?? 0) + e.qty);
    oreQty.set(ore, (oreQty.get(ore) ?? 0) + e.qty);
  }

  const priceOf = (ore: string) => prices[ore] ?? 0;
  const lineOf = (ore: string, qty: number): OreLine => {
    const { base, grade } = meta.get(ore) ?? { base: ore, grade: 0 };
    const price = priceOf(ore);
    return {
      ore,
      base,
      grade,
      category: categoryForBase(base).category,
      qty,
      price,
      value: qty * price,
    };
  };

  const miners: MinerRow[] = [...perMiner.entries()]
    .map(([miner, ores]) => {
      const byOre = [...ores.entries()]
        .map(([ore, qty]) => lineOf(ore, qty))
        .sort((a, b) => b.value - a.value || b.qty - a.qty);
      const value = byOre.reduce((a, o) => a + o.value, 0);
      const totalQty = byOre.reduce((a, o) => a + o.qty, 0);
      return { miner, totalQty, value, byOre, sharePct: 0 };
    })
    .sort((a, b) => b.value - a.value || b.totalQty - a.totalQty);

  const totalValue = miners.reduce((a, m) => a + m.value, 0);
  const totalQty = miners.reduce((a, m) => a + m.totalQty, 0);
  for (const m of miners) {
    m.sharePct =
      totalValue > 0
        ? (m.value / totalValue) * 100
        : totalQty > 0
        ? (m.totalQty / totalQty) * 100
        : 0;
  }

  const oreTotals: OreLine[] = [...oreQty.entries()]
    .map(([ore, qty]) => lineOf(ore, qty))
    .sort((a, b) => b.value - a.value || b.qty - a.qty);

  // Regroupement par catégorie
  const groupMap = new Map<string, OreLine[]>();
  for (const o of oreTotals) {
    if (!groupMap.has(o.category)) groupMap.set(o.category, []);
    groupMap.get(o.category)!.push(o);
  }
  const oreGroups: OreGroup[] = [...groupMap.entries()]
    .map(([category, ores]) => ({
      category,
      ores,
      qty: ores.reduce((a, o) => a + o.qty, 0),
      value: ores.reduce((a, o) => a + o.value, 0),
    }))
    .sort((a, b) => b.value - a.value || b.qty - a.qty);

  const hasPrices = oreTotals.some((o) => o.price > 0);

  return { miners, oreTotals, oreGroups, totalQty, totalValue, hasPrices };
}

// ───────────────────────── Consommables (cristaux de minage) ─────────────────────────

export interface ConsumableMinerShare {
  miner: string;
  qty: number;
  pct: number; // part de CE cristal consommée par ce pilote (0..100)
}

export interface ConsumableItem {
  name: string; // nom canonique du cristal
  totalQty: number;
  price: number; // ISK/unité (depuis orePrices)
  value: number; // coût total estimé
  byMiner: ConsumableMinerShare[];
}

export interface ConsumableMinerRow {
  miner: string;
  totalQty: number;
  value: number;
  pct: number; // part du coût total des consommables (0..100)
}

export interface ConsumablesSummary {
  items: ConsumableItem[];
  miners: ConsumableMinerRow[];
  totalQty: number;
  totalValue: number;
  hasAny: boolean;
  hasPrices: boolean;
}

/**
 * Agrège les cristaux de minage consommés pendant la session : par type et par
 * pilote (qui a consommé quoi, en quelle quantité, et quel % de chaque type).
 * Indépendant du minerai : ces consommables ne comptent pas dans le payout.
 */
export function consumablesSummary(s: Session): ConsumablesSummary {
  const prices = s.orePrices ?? {};
  const events = (s.lootEvents ?? []).filter((e) => isConsumable(oreKey(e)));

  const itemMiner = new Map<string, Map<string, number>>(); // cristal -> pilote -> qté
  const minerQty = new Map<string, number>();
  for (const e of events) {
    const name = oreKey(e);
    if (!itemMiner.has(name)) itemMiner.set(name, new Map());
    const mm = itemMiner.get(name)!;
    mm.set(e.miner, (mm.get(e.miner) ?? 0) + e.qty);
    minerQty.set(e.miner, (minerQty.get(e.miner) ?? 0) + e.qty);
  }

  const items: ConsumableItem[] = [...itemMiner.entries()]
    .map(([name, mm]) => {
      const totalQty = [...mm.values()].reduce((a, q) => a + q, 0);
      const price = prices[name] ?? 0;
      const byMiner: ConsumableMinerShare[] = [...mm.entries()]
        .map(([miner, qty]) => ({
          miner,
          qty,
          pct: totalQty > 0 ? (qty / totalQty) * 100 : 0,
        }))
        .sort((a, b) => b.qty - a.qty);
      return { name, totalQty, price, value: totalQty * price, byMiner };
    })
    .sort((a, b) => b.value - a.value || b.totalQty - a.totalQty);

  const totalQty = items.reduce((a, i) => a + i.totalQty, 0);
  const totalValue = items.reduce((a, i) => a + i.value, 0);

  const miners: ConsumableMinerRow[] = [...minerQty.entries()]
    .map(([miner, qty]) => {
      let value = 0;
      for (const it of items) {
        const share = it.byMiner.find((b) => b.miner === miner);
        if (share) value += share.qty * it.price;
      }
      return {
        miner,
        totalQty: qty,
        value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value || b.totalQty - a.totalQty);

  return {
    items,
    miners,
    totalQty,
    totalValue,
    hasAny: items.length > 0,
    hasPrices: items.some((i) => i.price > 0),
  };
}

/**
 * Valeur ISK effective d'une session pour l'affichage (stats, historique) :
 * butin valorisé au minerai miné si mode miné + loot, sinon le total saisi.
 */
/**
 * Une session est « au minerai miné » dès qu'elle contient des récoltes
 * (Diffusions collées) ; sinon la répartition se fait au temps de présence.
 * Le mode est donc déduit automatiquement (plus de sélecteur).
 */
export function isMinedSession(s: Session): boolean {
  return (s.lootEvents?.length ?? 0) > 0;
}

/**
 * Base de répartition effective : le choix explicite du joueur, sinon auto
 * (minerai miné s'il y a des récoltes, sinon temps de présence). Une base
 * « minerai miné » sans récolte retombe sur la présence.
 */
export function effectivePayoutBasis(s: Session): PayoutBasis {
  const hasLoot = (s.lootEvents?.length ?? 0) > 0;
  const chosen = s.payoutBasis ?? (hasLoot ? "mined" : "presence");
  return chosen === "mined" && !hasLoot ? "presence" : chosen;
}

export function sessionIskValue(s: Session): number {
  if (isMinedSession(s)) {
    const override = s.iskOverride ?? 0;
    return override > 0 ? override : minedSummary(s).totalValue;
  }
  return s.totalIsk;
}

/** Valeur brute du butin retenue en mode miné : override manuel sinon valeur Jita. */
export function minedGrossValue(s: Session): number {
  const override = s.iskOverride ?? 0;
  return override > 0 ? override : minedSummary(s).totalValue;
}

/** Payout final par mineur en mode « minerai miné » (après % rachat). */
export interface MinedPayoutRow {
  miner: string;
  value: number;
  payout: number;
  sharePct: number;
}

export function minedPayout(s: Session): {
  rows: MinedPayoutRow[];
  totalValue: number;
  totalPayout: number;
} {
  const { miners, totalValue, totalQty } = minedSummary(s);
  const pct = (s.buybackPct ?? 100) / 100;
  const override = s.iskOverride ?? 0;
  // Total brut retenu : override manuel sinon valeur Jita.
  const gross = override > 0 ? override : totalValue;
  // Répartition : au prorata de la valeur si dispo, sinon de la quantité minée
  // (permet de fixer un total manuel même sans prix renseignés).
  const useValue = totalValue > 0;
  const denom = useValue ? totalValue : totalQty;

  const rows = miners.map((m) => {
    const share = denom > 0 ? (useValue ? m.value : m.totalQty) / denom : 0;
    const grossShare = share * gross;
    return {
      miner: m.miner,
      value: grossShare,
      payout: grossShare * pct,
      sharePct: share * 100,
    };
  });
  return {
    rows,
    totalValue: gross,
    totalPayout: gross * pct,
  };
}

// ───────────────────────── Stock de consommables ─────────────────────────

export interface StockLine {
  name: string;
  qty: number;
  price: number;
  value: number;
}

export interface StockSummary {
  items: StockLine[];
  totalQty: number;
  totalValue: number;
  hasAny: boolean;
  hasPrices: boolean;
}

/**
 * Récapitule le stock de consommables (géré manuellement via Ajouter/Déduire),
 * valorisé au prix Jita. Aucune déduction automatique depuis les Diffusions :
 * les cristaux consommés par les membres sont suivis à part (consumablesSummary)
 * pour éviter toute double déduction.
 */
export function stockSummary(s: Session): StockSummary {
  const prices = s.stockPrices ?? {};
  const items: StockLine[] = (s.stock ?? [])
    .map((it) => {
      const price = prices[it.name] ?? 0;
      return { name: it.name, qty: it.qty, price, value: it.qty * price };
    })
    .sort((a, b) => b.value - a.value || b.qty - a.qty);

  return {
    items,
    totalQty: items.reduce((a, i) => a + i.qty, 0),
    totalValue: items.reduce((a, i) => a + i.value, 0),
    hasAny: items.length > 0,
    hasPrices: items.some((i) => i.price > 0),
  };
}

export interface StockLedgerLine {
  name: string;
  added: number; // total ajouté (+) sur la session
  removed: number; // total déduit (−) sur la session
  qty: number; // stock courant
  price: number;
  value: number; // qty × price
}

export interface StockLedger {
  items: StockLedgerLine[];
  totalAdded: number;
  totalRemoved: number;
  totalQty: number;
  totalValue: number;
  hasMoves: boolean;
  hasAny: boolean;
}

/**
 * Journal du stock pour le rapport : pour chaque consommable, le total ajouté (+),
 * le total déduit (−) et le stock courant. Inclut les objets entièrement consommés
 * (stock 0) tant qu'ils ont eu un mouvement, pour un bilan complet de session.
 */
export function stockLedger(s: Session): StockLedger {
  const prices = s.stockPrices ?? {};
  const log = s.stockLog ?? {};
  const cur = new Map(
    (s.stock ?? []).map((it) => [it.name.toLowerCase(), it])
  );
  const keys = new Set([...Object.keys(log), ...cur.keys()]);
  const items: StockLedgerLine[] = [...keys]
    .map((k) => {
      const c = cur.get(k);
      const mv = log[k];
      const name = c?.name ?? mv?.name ?? k;
      const qty = c?.qty ?? 0;
      const price = prices[name] ?? 0;
      return {
        name,
        added: mv?.added ?? 0,
        removed: mv?.removed ?? 0,
        qty,
        price,
        value: qty * price,
      };
    })
    .sort((a, b) => b.value - a.value || b.qty - a.qty);

  return {
    items,
    totalAdded: items.reduce((a, i) => a + i.added, 0),
    totalRemoved: items.reduce((a, i) => a + i.removed, 0),
    totalQty: items.reduce((a, i) => a + i.qty, 0),
    totalValue: items.reduce((a, i) => a + i.value, 0),
    hasMoves: items.some((i) => i.added > 0 || i.removed > 0),
    hasAny: items.length > 0,
  };
}

// ───────────────────────── Retraitement (minéraux produits) ─────────────────────────

export interface RefinedMineral {
  name: string;
  qty: number;
}

export interface RefineMinerShare {
  miner: string;
  qty: number; // total d'unités de minéraux produites par ce mineur
  pct: number; // part du total (0..100)
}

export interface RefineSummary {
  minerals: RefinedMineral[];
  miners: RefineMinerShare[];
  efficiency: number; // 0..1
  hasAny: boolean;
}

/**
 * Minéraux produits si l'on retraite tout le minerai miné de la session.
 * Rendement par défaut 100 % (parfait) ; `efficiency` permet d'appliquer un
 * rendement réel (skills + structure). Les consommables sont déjà exclus du
 * minerai par `minedSummary`.
 */
export function refineSummary(
  s: Session,
  efficiency = (s.refinePct ?? 100) / 100
): RefineSummary {
  const mined = minedSummary(s);
  const totals = new Map<string, number>();
  for (const o of mined.oreTotals) {
    const yields = REPROCESS[o.ore.toLowerCase()];
    if (!yields) continue;
    for (const y of yields)
      totals.set(y.m, (totals.get(y.m) ?? 0) + o.qty * y.q * efficiency);
  }
  // Ordre : minéraux/matériaux connus (MINERAL_ORDER) d'abord, puis tout extra par quantité.
  const order = MINERAL_ORDER as readonly string[];
  const known = order.filter((m) => totals.has(m));
  const extra = [...totals.keys()]
    .filter((m) => !order.includes(m))
    .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  const minerals: RefinedMineral[] = [...known, ...extra].map((m) => ({
    name: m,
    qty: totals.get(m)!,
  }));

  // Part par mineur : unités totales de minéraux produites par chacun.
  const grand = minerals.reduce((a, m) => a + m.qty, 0);
  const miners: RefineMinerShare[] = mined.miners
    .map((mn) => {
      let units = 0;
      for (const o of mn.byOre) {
        const yields = REPROCESS[o.ore.toLowerCase()];
        if (!yields) continue;
        for (const y of yields) units += o.qty * y.q * efficiency;
      }
      return { miner: mn.miner, qty: units, pct: grand > 0 ? (units / grand) * 100 : 0 };
    })
    .filter((m) => m.qty > 0)
    .sort((a, b) => b.qty - a.qty);

  return { minerals, miners, efficiency, hasAny: minerals.length > 0 };
}

// ───────────────────────── Contributions par pilote ─────────────────────────

export interface Contribution {
  name: string;
  isk: number;
  activeMs: number;
  units: number;
  barge?: string;
  ores: Map<string, number>; // nom canonique -> quantité
}

/**
 * Contribution de chaque pilote pour UNE session, indexée par nom (minuscule).
 * - unités & minerais : toujours issus des Diffusions (indépendant du mode) ;
 * - ISK : payout au minerai miné s'il y a du loot, sinon part au temps de présence ;
 * - présence & barge : depuis les membres de la session.
 */
export function sessionContributions(s: Session): Map<string, Contribution> {
  const ref = s.endedAt ?? s.startedAt;
  const hasLoot = (s.lootEvents?.length ?? 0) > 0;
  const ms = hasLoot ? minedSummary(s) : null;

  const map = new Map<string, Contribution>();
  const get = (name: string): Contribution => {
    const k = name.toLowerCase();
    let c = map.get(k);
    if (!c) {
      c = { name, isk: 0, activeMs: 0, units: 0, barge: undefined, ores: new Map() };
      map.set(k, c);
    }
    return c;
  };

  for (const m of s.members) {
    const c = get(m.name);
    c.activeMs = activeMs(m, ref);
    c.barge = m.barge;
  }

  if (ms) {
    for (const mn of ms.miners) {
      const c = get(mn.miner);
      c.units = mn.totalQty;
      for (const o of mn.byOre)
        c.ores.set(o.ore, (c.ores.get(o.ore) ?? 0) + o.qty);
    }
  }

  const basis = effectivePayoutBasis(s);
  if (basis === "mined" && hasLoot) {
    // Au prorata du minerai miné (valeur, sinon quantité), après rachat.
    for (const r of minedPayout(s).rows) get(r.miner).isk = r.payout;
  } else {
    // Pool à répartir (avant bonus FC/scout) : butin miné après rachat, ou
    // total saisi en mode présence.
    const pool = hasLoot
      ? minedGrossValue(s) * ((s.buybackPct ?? 100) / 100)
      : s.totalIsk;
    if (basis === "equal") {
      const per = s.members.length ? pool / s.members.length : 0;
      for (const m of s.members) get(m.name).isk = per;
    } else {
      // presence : au prorata du temps de présence actif.
      const rows = s.members.map((m) => ({
        name: m.name,
        ms: activeMs(m, ref),
      }));
      const totalMs = rows.reduce((a, r) => a + r.ms, 0);
      const n = rows.length || 1;
      for (const r of rows) {
        const share =
          totalMs > 0 ? r.ms / totalMs : s.members.length ? 1 / n : 0;
        get(r.name).isk = pool * share;
      }
    }
  }

  return map;
}

// ───────────────────────── Payout d'une session (par joueur) ─────────────────────────

export interface PayoutLine {
  key: string; // clé joueur (groupe ou perso)
  name: string;
  isk: number;
  scout?: boolean;
  fc?: boolean;
}

/**
 * Montants à reverser pour UNE session, agrégés par joueur (alts fusionnés).
 * Reflète le mode (minerai miné après rachat, ou temps de présence).
 *
 * Scouts/explorateurs : chaque scout touche `scoutPct` % du butin distribuable,
 * prélevé sur le total ; les parts des mineurs sont réduites au prorata pour que
 * le total reste conservé.
 */
export function sessionPayout(
  s: Session,
  members: Member[] = [],
  groups: PlayerGroup[] = []
): PayoutLine[] {
  const resolver = makePlayerResolver(members, groups);
  const map = new Map<string, PayoutLine>();
  for (const c of sessionContributions(s).values()) {
    const r = resolver.resolve(c.name);
    const row = map.get(r.key) ?? { key: r.key, name: r.name, isk: 0 };
    row.name = r.name;
    row.isk += c.isk;
    map.set(r.key, row);
  }

  // Scouts + Fleet Commander (membres tagués) résolus en clés de joueur.
  const scoutKeys = new Set<string>();
  const fcKeys = new Set<string>();
  for (const m of s.members) {
    if (m.scout) scoutKeys.add(resolver.resolve(m.name).key);
    if (m.fc) fcKeys.add(resolver.resolve(m.name).key);
  }
  // Un scout / FC peut ne pas avoir miné : on l'ajoute avec 0.
  for (const key of new Set([...scoutKeys, ...fcKeys])) {
    if (!map.has(key)) {
      const m = s.members.find((mm) => resolver.resolve(mm.name).key === key);
      const name = m ? resolver.resolve(m.name).name : key;
      map.set(key, { key, name, isk: 0 });
    }
  }
  for (const row of map.values()) {
    row.scout = scoutKeys.has(row.key);
    row.fc = fcKeys.has(row.key);
  }

  const base = [...map.values()];
  const distributable = base.reduce((a, r) => a + r.isk, 0);
  const scoutPct = Math.max(0, Math.min(100, s.scoutPct ?? 0)) / 100;
  const fcPct = Math.max(0, Math.min(100, s.fcPct ?? 0)) / 100;
  // Parts prélevées sur le total ; si elles dépassent 100 %, on les ramène au prorata.
  const rawScout = distributable * scoutPct * scoutKeys.size;
  const rawFc = distributable * fcPct * fcKeys.size;
  const rawCuts = rawScout + rawFc;
  const totalCuts = Math.min(distributable, rawCuts);
  const cutScale = rawCuts > 0 ? totalCuts / rawCuts : 0;
  const perScout = distributable * scoutPct * cutScale;
  const perFc = distributable * fcPct * cutScale;
  const scale = distributable > 0 ? (distributable - totalCuts) / distributable : 0;

  return base
    .map((r) => ({
      key: r.key,
      name: r.name,
      scout: r.scout,
      fc: r.fc,
      isk:
        r.isk * scale + (r.scout ? perScout : 0) + (r.fc ? perFc : 0),
    }))
    .filter((r) => r.isk > 0)
    .sort((a, b) => b.isk - a.isk);
}

/** Agrégat pour le leaderboard global (toutes sessions terminées), par joueur. */
export interface LeaderboardRow {
  key: string; // clé d'agrégation (joueur, alts fusionnés)
  name: string;
  alts: string[]; // personnages distincts regroupés sous ce joueur
  sessions: number;
  totalActiveMs: number;
  totalIsk: number;
  totalUnits: number; // unités de minerai minées (mode miné)
}

/**
 * Classement cumulé par JOUEUR (les alts d'un même joueur sont fusionnés).
 * En mode « minerai miné » on prend le payout réel ; sinon la part au temps de
 * présence. Une session n'est comptée qu'une fois par joueur même s'il y a
 * plusieurs alts présents.
 */
export function buildLeaderboard(
  sessions: Session[],
  members: Member[] = [],
  groups: PlayerGroup[] = []
): LeaderboardRow[] {
  const resolver = makePlayerResolver(members, groups);
  const map = new Map<string, LeaderboardRow>();

  for (const s of sessions) {
    if (s.status !== "ended") continue;
    // agrège d'abord par joueur AU SEIN de la session (fusion des alts)
    const perPlayer = new Map<
      string,
      { name: string; isk: number; ms: number; units: number; alts: Set<string> }
    >();
    for (const c of sessionContributions(s).values()) {
      const r = resolver.resolve(c.name);
      const agg =
        perPlayer.get(r.key) ??
        { name: r.name, isk: 0, ms: 0, units: 0, alts: new Set<string>() };
      agg.isk += c.isk;
      agg.ms += c.activeMs;
      agg.units += c.units;
      agg.alts.add(c.name);
      perPlayer.set(r.key, agg);
    }
    for (const [key, agg] of perPlayer) {
      const row =
        map.get(key) ??
        {
          key,
          name: agg.name,
          alts: [],
          sessions: 0,
          totalActiveMs: 0,
          totalIsk: 0,
          totalUnits: 0,
        };
      row.name = agg.name;
      row.sessions += 1;
      row.totalActiveMs += agg.ms;
      row.totalIsk += agg.isk;
      row.totalUnits += agg.units;
      const altSet = new Set(row.alts);
      agg.alts.forEach((a) => altSet.add(a));
      row.alts = [...altSet];
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => b.totalIsk - a.totalIsk);
}

// ───────────────────────── Tableau de bord (KPIs) ─────────────────────────

export interface NamedValue {
  label: string;
  value: number;
}

export interface LeaderboardStats {
  totalIsk: number;
  totalUnits: number;
  totalActiveMs: number;
  playerCount: number;
  sessionCount: number;
  iskPerHour: number;
  topPlayer: string | null;
  iskByPlayer: NamedValue[]; // top joueurs + « Autres »
  presenceByPlayer: NamedValue[]; // présence (ms) par joueur
  oreByCategory: NamedValue[]; // composition du minerai (valeur ISK ou qté)
  oreCompositionByValue: boolean;
}

/** Réduit une liste à `topN` entrées + un cumul « Autres ». */
function topNPlusOther(items: NamedValue[], topN: number): NamedValue[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= topN) return sorted;
  const head = sorted.slice(0, topN);
  const rest = sorted.slice(topN).reduce((a, x) => a + x.value, 0);
  if (rest > 0) head.push({ label: "Autres", value: rest });
  return head;
}

/** Statistiques globales pour le tableau de bord du leaderboard. */
export function leaderboardStats(
  sessions: Session[],
  members: Member[] = [],
  groups: PlayerGroup[] = []
): LeaderboardStats {
  const rows = buildLeaderboard(sessions, members, groups);
  const totalIsk = rows.reduce((a, r) => a + r.totalIsk, 0);
  const totalUnits = rows.reduce((a, r) => a + r.totalUnits, 0);
  const totalActiveMs = rows.reduce((a, r) => a + r.totalActiveMs, 0);
  const sessionCount = sessions.filter((s) => s.status === "ended").length;

  // Composition du minerai (par catégorie), valeur ISK sinon quantité.
  const valueByCat = new Map<string, number>();
  const qtyByCat = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== "ended") continue;
    for (const g of minedSummary(s).oreGroups) {
      valueByCat.set(g.category, (valueByCat.get(g.category) ?? 0) + g.value);
      qtyByCat.set(g.category, (qtyByCat.get(g.category) ?? 0) + g.qty);
    }
  }
  const totalValue = [...valueByCat.values()].reduce((a, v) => a + v, 0);
  const byValue = totalValue > 0;
  const src = byValue ? valueByCat : qtyByCat;
  const oreByCategory = topNPlusOther(
    [...src.entries()].map(([label, value]) => ({ label, value })),
    6
  );

  const hours = totalActiveMs / 3_600_000;
  return {
    totalIsk,
    totalUnits,
    totalActiveMs,
    playerCount: rows.length,
    sessionCount,
    iskPerHour: hours > 0 ? totalIsk / hours : 0,
    topPlayer: rows[0]?.name ?? null,
    iskByPlayer: topNPlusOther(
      rows.map((r) => ({ label: r.name, value: r.totalIsk })),
      6
    ),
    presenceByPlayer: topNPlusOther(
      rows.map((r) => ({ label: r.name, value: r.totalActiveMs })),
      6
    ),
    oreByCategory,
    oreCompositionByValue: byValue,
  };
}

// ───────────────────────── Fiche individuelle d'un pilote ─────────────────────────

export interface PilotSessionLine {
  sessionId: string;
  name: string;
  startedAt: number;
  types: Session["types"];
  isk: number;
  activeMs: number;
  units: number;
  barge?: string;
}

export interface PilotHistory {
  name: string;
  alts: string[]; // personnages (alts) composant ce joueur
  sessions: PilotSessionLine[];
  ores: { ore: string; qty: number }[];
  barges: { ship: string; count: number }[];
  totalIsk: number;
  totalActiveMs: number;
  totalUnits: number;
}

/** Cœur d'agrégation : retient les contributions dont le nom satisfait `matches`. */
function aggregateHistory(
  sessions: Session[],
  matches: (characterName: string) => boolean,
  initialName: string
): PilotHistory {
  const lines: PilotSessionLine[] = [];
  const oreAgg = new Map<string, number>();
  const bargeAgg = new Map<string, number>();
  const alts = new Set<string>();
  let name = initialName;
  let totalIsk = 0;
  let totalActiveMs = 0;
  let totalUnits = 0;

  for (const s of sessions) {
    if (s.status !== "ended") continue;
    let isk = 0;
    let activeMs = 0;
    let units = 0;
    const barges = new Set<string>();
    let any = false;
    for (const c of sessionContributions(s).values()) {
      if (!matches(c.name)) continue;
      any = true;
      alts.add(c.name);
      isk += c.isk;
      activeMs += c.activeMs;
      units += c.units;
      if (c.barge) {
        barges.add(c.barge);
        bargeAgg.set(c.barge, (bargeAgg.get(c.barge) ?? 0) + 1);
      }
      for (const [ore, qty] of c.ores)
        oreAgg.set(ore, (oreAgg.get(ore) ?? 0) + qty);
    }
    if (!any) continue;
    lines.push({
      sessionId: s.id,
      name: s.name,
      startedAt: s.startedAt,
      types: s.types,
      isk,
      activeMs,
      units,
      barge: [...barges].join(", ") || undefined,
    });
    totalIsk += isk;
    totalActiveMs += activeMs;
    totalUnits += units;
  }

  lines.sort((a, b) => b.startedAt - a.startedAt);
  return {
    name,
    alts: [...alts],
    sessions: lines,
    ores: [...oreAgg.entries()]
      .map(([ore, qty]) => ({ ore, qty }))
      .sort((a, b) => b.qty - a.qty),
    barges: [...bargeAgg.entries()]
      .map(([ship, count]) => ({ ship, count }))
      .sort((a, b) => b.count - a.count),
    totalIsk,
    totalActiveMs,
    totalUnits,
  };
}

/** Historique d'un JOUEUR (clé de joueur résolue), alts fusionnés. */
export function pilotHistory(
  sessions: Session[],
  members: Member[],
  groups: PlayerGroup[],
  key: string
): PilotHistory {
  const resolver = makePlayerResolver(members, groups);
  // nom affiché = nom du joueur résolu (cherché sur une contribution)
  let display = key;
  for (const s of sessions) {
    for (const c of sessionContributions(s).values()) {
      const r = resolver.resolve(c.name);
      if (r.key === key) {
        display = r.name;
        break;
      }
    }
    if (display !== key) break;
  }
  return aggregateHistory(
    sessions,
    (charName) => resolver.resolve(charName).key === key,
    display
  );
}

/** Historique d'un seul PERSONNAGE (pas de fusion d'alts). */
export function characterHistory(
  sessions: Session[],
  characterName: string
): PilotHistory {
  const lower = characterName.toLowerCase();
  return aggregateHistory(
    sessions,
    (charName) => charName.toLowerCase() === lower,
    characterName
  );
}
