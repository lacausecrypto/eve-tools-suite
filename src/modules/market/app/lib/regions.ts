/**
 * Régions et hubs commerciaux — constantes SDE **stables** (id de région / station
 * des grands marchés). On reste sur les API publiques : interroger une région donne
 * tous ses ordres, qu'on étiquette ensuite par région.
 */

export interface MarketScope {
  /** Libellé affiché. */
  label: string;
  /** Régions interrogées pour le carnet d'ordres. */
  regions: number[];
  /** Station-hub de référence (pour repérer « le » prix du hub). */
  hub: number;
  /** Région utilisée pour la courbe d'historique (une seule région à la fois). */
  historyRegion: number;
}

/** Portées de marché proposées (hubs majeurs + agrégat). */
export const SCOPES: Record<string, MarketScope> = {
  forge: {
    label: "Jita · The Forge",
    regions: [10000002],
    hub: 60003760,
    historyRegion: 10000002,
  },
  domain: {
    label: "Amarr · Domain",
    regions: [10000043],
    hub: 60008494,
    historyRegion: 10000043,
  },
  sinq: {
    label: "Dodixie · Sinq Laison",
    regions: [10000032],
    hub: 60011866,
    historyRegion: 10000032,
  },
  heimatar: {
    label: "Rens · Heimatar",
    regions: [10000030],
    hub: 60004588,
    historyRegion: 10000030,
  },
  metropolis: {
    label: "Hek · Metropolis",
    regions: [10000042],
    hub: 60005686,
    historyRegion: 10000042,
  },
  hubs: {
    label: "Tous les hubs majeurs",
    regions: [10000002, 10000043, 10000032, 10000030, 10000042],
    hub: 60003760,
    historyRegion: 10000002,
  },
};

export type ScopeId = keyof typeof SCOPES;
export const DEFAULT_SCOPE: ScopeId = "hubs";

/** Noms des régions interrogées (pour l'affichage, sans appel ESI). */
export const REGION_NAMES: Record<number, string> = {
  10000002: "The Forge",
  10000043: "Domain",
  10000032: "Sinq Laison",
  10000030: "Heimatar",
  10000042: "Metropolis",
};

/** Au-delà de cet id, une localisation est une structure joueur (non publique). */
export const STRUCTURE_ID_FLOOR = 1_000_000_000_000;
