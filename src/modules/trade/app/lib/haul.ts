/**
 * Planification de **hauling** — **pure** (groupement par segment, trajets,
 * itinéraire optimisé, totaux). Aucune dépendance réseau : la matrice de sauts
 * est injectée (`jumpsOf`), si bien que tout est unitairement testable.
 */

/** Un objet à transporter (issu d'un deal d'arbitrage sélectionné). */
export interface HaulItem {
  typeId: number;
  name: string;
  qty: number;
  /** Volume **packaged** par unité (m³). */
  unitVolume: number;
  /** Coût d'acquisition total (sert de **collatéral** courier). */
  buyCost: number;
  /** Profit net total attendu. */
  profit: number;
  srcHubId: string;
  srcLabel: string;
  dstHubId: string;
  dstLabel: string;
}

/** Vaisseau de transport (capacité cargo m³ indicative, configurable). */
export interface ShipPreset {
  id: string;
  label: string;
  cargo: number;
  /** type_id EVE d'un vaisseau représentatif (pour l'icône). */
  typeId: number;
}

export const SHIP_PRESETS: ShipPreset[] = [
  { id: "br", label: "Blockade Runner (furtif)", cargo: 11_500, typeId: 12729 }, // Prowler
  { id: "t1", label: "Industriel T1 (cargo)", cargo: 33_000, typeId: 648 }, // Badger
  { id: "dst", label: "Deep Space Transport", cargo: 62_000, typeId: 12745 }, // Mastodon
  { id: "orca", label: "Orca", cargo: 150_000, typeId: 28606 }, // Orca
  { id: "jf", label: "Jump Freighter", cargo: 360_000, typeId: 28850 }, // Rhea
  { id: "freighter", label: "Freighter", cargo: 1_100_000, typeId: 20185 }, // Charon
];

/** Un segment de l'itinéraire (un couple hub d'achat → hub de vente). */
export interface SegmentPlan {
  key: string;
  srcHubId: string;
  srcLabel: string;
  dstHubId: string;
  dstLabel: string;
  items: HaulItem[];
  /** Volume total à transporter (m³). */
  volume: number;
  buyCost: number;
  profit: number;
  /** Nombre de trajets = ceil(volume / cargo). */
  trips: number;
  /** Sauts un sens (chargé) sur ce segment, selon la sécurité. */
  jumps: number | null;
  /** Sauts à vide pour rejoindre ce segment depuis le précédent (ordre). */
  repositionJumps: number | null;
}

export interface HaulTotals {
  volume: number;
  buyCost: number;
  profit: number;
  trips: number;
  /** Sauts chargés (Σ jumps × trips). */
  ladenJumps: number;
  /** Sauts à vide (retours entre trajets + repositionnement entre segments). */
  emptyJumps: number;
  totalJumps: number;
  iskPerM3: number;
  iskPerJump: number;
  iskPerTrip: number;
}

export interface HaulPlan {
  segments: SegmentPlan[];
  totals: HaulTotals;
}

/** Sauts entre deux hubs (depuis la matrice pré-calculée), `null` si inconnu. */
export type JumpsOf = (srcId: string, dstId: string) => number | null;

/**
 * Construit le plan : groupe les objets par segment, calcule les trajets selon la
 * capacité cargo, **ordonne** les segments au plus court (nearest-neighbor depuis
 * `homeHubId`, en minimisant le repositionnement à vide), puis agrège les totaux.
 */
export function planHaul(
  items: HaulItem[],
  cargoM3: number,
  jumpsOf: JumpsOf,
  homeHubId = "forge",
): HaulPlan {
  const groups = new Map<string, SegmentPlan>();
  for (const it of items) {
    const key = `${it.srcHubId}>${it.dstHubId}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        srcHubId: it.srcHubId,
        srcLabel: it.srcLabel,
        dstHubId: it.dstHubId,
        dstLabel: it.dstLabel,
        items: [],
        volume: 0,
        buyCost: 0,
        profit: 0,
        trips: 0,
        jumps: jumpsOf(it.srcHubId, it.dstHubId),
        repositionJumps: null,
      };
      groups.set(key, g);
    }
    g.items.push(it);
    g.volume += it.qty * it.unitVolume;
    g.buyCost += it.buyCost;
    g.profit += it.profit;
  }

  const cargo = cargoM3 > 0 ? cargoM3 : Number.POSITIVE_INFINITY;
  for (const g of groups.values()) {
    g.trips = g.volume > 0 ? Math.max(1, Math.ceil(g.volume / cargo)) : 1;
  }

  // Ordonnancement : nearest-neighbor, minimise le repositionnement à vide.
  const remaining = [...groups.values()];
  const ordered: SegmentPlan[] = [];
  let current = homeHubId;
  while (remaining.length) {
    let bestIdx = 0;
    let bestRepos = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const r = jumpsOf(current, remaining[i].srcHubId);
      const v = r == null ? Number.MAX_SAFE_INTEGER : r;
      if (v < bestRepos) {
        bestRepos = v;
        bestIdx = i;
      }
    }
    const seg = remaining.splice(bestIdx, 1)[0];
    seg.repositionJumps = jumpsOf(current, seg.srcHubId);
    ordered.push(seg);
    current = seg.dstHubId;
  }

  let volume = 0;
  let buyCost = 0;
  let profit = 0;
  let trips = 0;
  let ladenJumps = 0;
  let emptyJumps = 0;
  for (const s of ordered) {
    volume += s.volume;
    buyCost += s.buyCost;
    profit += s.profit;
    trips += s.trips;
    if (s.jumps != null) {
      ladenJumps += s.jumps * s.trips;
      // Retours à vide entre trajets du même segment (sauf après le dernier).
      emptyJumps += s.jumps * Math.max(0, s.trips - 1);
    }
    if (s.repositionJumps != null) emptyJumps += s.repositionJumps;
  }
  const totalJumps = ladenJumps + emptyJumps;
  const totals: HaulTotals = {
    volume,
    buyCost,
    profit,
    trips,
    ladenJumps,
    emptyJumps,
    totalJumps,
    iskPerM3: volume > 0 ? profit / volume : 0,
    iskPerJump: totalJumps > 0 ? profit / totalJumps : 0,
    iskPerTrip: trips > 0 ? profit / trips : 0,
  };
  return { segments: ordered, totals };
}
