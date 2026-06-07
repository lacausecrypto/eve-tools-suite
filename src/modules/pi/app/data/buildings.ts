/**
 * Installations PI et budget **CPU / Powergrid** — valeurs de jeu exactes.
 *
 * Sources : EVE University (Planetary buildings). Le Command Center fournit un
 * budget CPU/PG qui croît avec la compétence *Command Center Upgrades* (niveaux
 * 0→5) ; chaque installation consomme un coût fixe, et chaque **tête**
 * d'extracteur ajoute 110 tf / 550 MW.
 */

export type BuildingType =
  | "extractor"
  | "basic"
  | "advanced"
  | "hightech"
  | "storage"
  | "launchpad";

export interface BuildingSpec {
  id: BuildingType;
  name: string;
  /** Coût CPU (tf). */
  cpu: number;
  /** Coût Powergrid (MW). */
  pg: number;
  /** Coût ISK indicatif (approx. marché). */
  isk: number;
  /** Capacité de stockage (m³), si applicable. */
  storage?: number;
}

export const BUILDINGS: Record<BuildingType, BuildingSpec> = {
  extractor: {
    id: "extractor",
    name: "Extractor Control Unit",
    cpu: 400,
    pg: 2600,
    isk: 45_000,
  },
  basic: {
    id: "basic",
    name: "Basic Industry Facility",
    cpu: 200,
    pg: 800,
    isk: 75_000,
  },
  advanced: {
    id: "advanced",
    name: "Advanced Industry Facility",
    cpu: 500,
    pg: 700,
    isk: 250_000,
  },
  hightech: {
    id: "hightech",
    name: "High-Tech Industry Facility",
    cpu: 1100,
    pg: 400,
    isk: 250_000,
  },
  storage: {
    id: "storage",
    name: "Storage Facility",
    cpu: 500,
    pg: 700,
    isk: 250_000,
    storage: 12_000,
  },
  launchpad: {
    id: "launchpad",
    name: "Launchpad",
    cpu: 3600,
    pg: 700,
    isk: 900_000,
    storage: 10_000,
  },
};

export const BUILDING_ORDER: BuildingType[] = [
  "extractor",
  "basic",
  "advanced",
  "hightech",
  "storage",
  "launchpad",
];

/** Coût d'une **tête** d'extracteur supplémentaire. */
export const EXTRACTOR_HEAD = { cpu: 110, pg: 550 } as const;

/** Capacité CPU/PG fournie par le Command Center selon le niveau (0→5). */
export const CC_CAPACITY: { cpu: number; pg: number }[] = [
  { cpu: 1675, pg: 6000 },
  { cpu: 7057, pg: 9000 },
  { cpu: 12136, pg: 12000 },
  { cpu: 17215, pg: 15000 },
  { cpu: 21315, pg: 17000 },
  { cpu: 25415, pg: 19000 },
];

/**
 * Presets de **densité de gisement** → valeur de base par cycle et par tête.
 * ⚠️ **Estimation** : la valeur exacte est lue sur l'ECU in-game (dépend du
 * gisement précis et de la durée du programme). Sert de point de départ.
 */
export interface RichnessPreset {
  id: string;
  label: string;
  qtyPerCycle: number;
}

export const RICHNESS: RichnessPreset[] = [
  { id: "poor", label: "Poor", qtyPerCycle: 500 },
  { id: "average", label: "Average", qtyPerCycle: 1200 },
  { id: "rich", label: "Rich", qtyPerCycle: 2200 },
  { id: "perfect", label: "Perfect", qtyPerCycle: 3500 },
];

/** Coût CPU/PG d'une installation placée (extracteur : + têtes). */
export function buildingCost(type: BuildingType, heads = 0): {
  cpu: number;
  pg: number;
} {
  const b = BUILDINGS[type];
  if (type === "extractor") {
    return {
      cpu: b.cpu + heads * EXTRACTOR_HEAD.cpu,
      pg: b.pg + heads * EXTRACTOR_HEAD.pg,
    };
  }
  return { cpu: b.cpu, pg: b.pg };
}
