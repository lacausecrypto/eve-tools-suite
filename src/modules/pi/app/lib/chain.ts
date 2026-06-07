/**
 * Planificateur de chaîne PI : à partir d'un **produit cible** (P1→P4) et d'un
 * débit visé (unités/h), calcule récursivement la **nomenclature** complète :
 * débit requis et nombre d'usines à chaque palier, besoins en matières brutes
 * P0, et les types de planète à exploiter.
 *
 * Les entrées partagées entre plusieurs branches sont **agrégées** (sommées),
 * pour un plan réaliste et sans double comptage.
 */
import {
  commodity,
  commodityName,
  planetsForRaw,
  schematic,
  type PlanetType,
  type Tier,
} from "../data/commodities";

export interface ChainNode {
  id: string;
  name: string;
  tier: Tier;
  /** Débit requis de cette marchandise (unités/h). */
  perHour: number;
  /** Usines nécessaires (cycles concurrents) — 0 pour les P0 (extraction). */
  factories: number;
}

export interface RawNeed {
  id: string;
  name: string;
  perHour: number;
  planets: PlanetType[];
}

export interface ChainPlan {
  target: string;
  targetPerHour: number;
  /** Tous les paliers intermédiaires + le produit (tier décroissant). */
  nodes: ChainNode[];
  /** Matières brutes P0 à extraire. */
  raws: RawNeed[];
  /** Union des types de planète nécessaires. */
  planetTypes: PlanetType[];
  /** Nombre total d'usines (paliers P1+). */
  totalFactories: number;
}

/** Calcule la nomenclature pour produire `targetPerHour` u/h de `targetId`. */
export function planChain(targetId: string, targetPerHour: number): ChainPlan {
  const demand = new Map<string, number>(); // id → unités/h cumulées

  const add = (id: string, perHour: number) => {
    demand.set(id, (demand.get(id) ?? 0) + perHour);
    const sch = schematic(id);
    if (!sch) return; // P0 : feuille (extraction)
    // Cycles/h à soutenir pour produire `perHour` (sortie outputQty/cycle).
    const runsPerHour = perHour / sch.outputQty;
    for (const inp of sch.inputs) add(inp.id, runsPerHour * inp.qty);
  };
  add(targetId, targetPerHour);

  const nodes: ChainNode[] = [];
  const raws: RawNeed[] = [];

  for (const [id, perHour] of demand) {
    const c = commodity(id);
    const tier = (c?.tier ?? 0) as Tier;
    if (tier === 0) {
      raws.push({
        id,
        name: commodityName(id),
        perHour,
        planets: planetsForRaw(id),
      });
      continue;
    }
    const sch = schematic(id)!;
    const perFactoryPerHour = sch.outputQty * (3600 / sch.cycleSec);
    const factories = Math.ceil(perHour / perFactoryPerHour - 1e-9);
    nodes.push({ id, name: commodityName(id), tier, perHour, factories });
  }

  nodes.sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
  raws.sort((a, b) => b.perHour - a.perHour);

  const planetTypes = [...new Set(raws.flatMap((r) => r.planets))].sort();
  const totalFactories = nodes.reduce((s, n) => s + n.factories, 0);

  return {
    target: targetId,
    targetPerHour,
    nodes,
    raws,
    planetTypes,
    totalFactories,
  };
}
