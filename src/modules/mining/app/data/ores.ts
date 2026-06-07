// EVE Online — base de données de minerais organisée par type de gisement.
// Sert au sélecteur de minerai (type + catégorie) et au rapport de session.

export type BeltType = "standard" | "ice" | "anomaly" | "moon";

export interface Ore {
  id: string;
  name: string;
  type: BeltType;
  category: string;
}

export const BELT_TYPES: {
  value: BeltType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "standard",
    label: "Belt standard",
    description: "Ceintures d'astéroïdes classiques",
    icon: "⛏️",
  },
  {
    value: "anomaly",
    label: "Anomalie",
    description: "Anomalies de minage (ABC, Mercoxit)",
    icon: "🛰️",
  },
  {
    value: "moon",
    label: "Minerai lunaire",
    description: "Champs de minage lunaire (moon ore, R4-R64)",
    icon: "🌙",
  },
  {
    value: "ice",
    label: "Glace",
    description: "Champs de glace (ice belts)",
    icon: "❄️",
  },
];

export const BELT_TYPE_LABEL: Record<BeltType, string> = {
  standard: "Belt standard",
  anomaly: "Anomalie",
  moon: "Minerai lunaire",
  ice: "Glace",
};

export const ORES: Ore[] = [
  // ───────────────────────── Belt standard ─────────────────────────
  { id: "veldspar", name: "Veldspar", type: "standard", category: "Commun (Highsec)" },
  { id: "scordite", name: "Scordite", type: "standard", category: "Commun (Highsec)" },
  { id: "pyroxeres", name: "Pyroxeres", type: "standard", category: "Commun (Highsec)" },
  { id: "plagioclase", name: "Plagioclase", type: "standard", category: "Commun (Highsec)" },
  { id: "omber", name: "Omber", type: "standard", category: "Peu commun (Lowsec)" },
  { id: "kernite", name: "Kernite", type: "standard", category: "Peu commun (Lowsec)" },
  { id: "jaspet", name: "Jaspet", type: "standard", category: "Peu commun (Lowsec)" },
  { id: "hemorphite", name: "Hemorphite", type: "standard", category: "Peu commun (Lowsec)" },
  { id: "hedbergite", name: "Hedbergite", type: "standard", category: "Peu commun (Lowsec)" },
  { id: "gneiss", name: "Gneiss", type: "standard", category: "Rare (Nullsec)" },
  { id: "dark-ochre", name: "Dark Ochre", type: "standard", category: "Rare (Nullsec)" },
  { id: "spodumain", name: "Spodumain", type: "standard", category: "Précieux (Nullsec)" },
  { id: "mordunium", name: "Mordunium", type: "standard", category: "Frontline (Guerre de factions)" },

  // ───────────────────────── Anomalie (ABC + Mercoxit) ─────────────────────────
  { id: "crokite", name: "Crokite", type: "anomaly", category: "ABC (Nullsec)" },
  { id: "bistot", name: "Bistot", type: "anomaly", category: "ABC (Nullsec)" },
  { id: "arkonor", name: "Arkonor", type: "anomaly", category: "ABC (Nullsec)" },
  { id: "mercoxit", name: "Mercoxit", type: "anomaly", category: "Mercoxit (Mercure)" },

  // ───────────────────────── Minerai lunaire (moon ore) ─────────────────────────
  // Ubiquitous
  { id: "bitumens", name: "Bitumens", type: "moon", category: "Lunaire · Ubiquitous" },
  { id: "sylvite", name: "Sylvite", type: "moon", category: "Lunaire · Ubiquitous" },
  { id: "zeolites", name: "Zeolites", type: "moon", category: "Lunaire · Ubiquitous" },
  { id: "coesite", name: "Coesite", type: "moon", category: "Lunaire · Ubiquitous" },
  // Moon ore — Common
  { id: "cobaltite", name: "Cobaltite", type: "moon", category: "Lunaire · Common" },
  { id: "euxenite", name: "Euxenite", type: "moon", category: "Lunaire · Common" },
  { id: "scheelite", name: "Scheelite", type: "moon", category: "Lunaire · Common" },
  { id: "titanite", name: "Titanite", type: "moon", category: "Lunaire · Common" },
  // Moon ore — Uncommon
  { id: "otavite", name: "Otavite", type: "moon", category: "Lunaire · Uncommon" },
  { id: "sperrylite", name: "Sperrylite", type: "moon", category: "Lunaire · Uncommon" },
  { id: "vanadinite", name: "Vanadinite", type: "moon", category: "Lunaire · Uncommon" },
  { id: "chromite", name: "Chromite", type: "moon", category: "Lunaire · Uncommon" },
  // Moon ore — Rare
  { id: "carnotite", name: "Carnotite", type: "moon", category: "Lunaire · Rare" },
  { id: "cinnabar", name: "Cinnabar", type: "moon", category: "Lunaire · Rare" },
  { id: "pollucite", name: "Pollucite", type: "moon", category: "Lunaire · Rare" },
  { id: "zircon", name: "Zircon", type: "moon", category: "Lunaire · Rare" },
  // Moon ore — Exceptional
  { id: "loparite", name: "Loparite", type: "moon", category: "Lunaire · Exceptional" },
  { id: "monazite", name: "Monazite", type: "moon", category: "Lunaire · Exceptional" },
  { id: "xenotime", name: "Xenotime", type: "moon", category: "Lunaire · Exceptional" },
  { id: "ytterbite", name: "Ytterbite", type: "moon", category: "Lunaire · Exceptional" },

  // ───────────────────────── Glace ─────────────────────────
  { id: "blue-ice", name: "Blue Ice", type: "ice", category: "Highsec" },
  { id: "clear-icicle", name: "Clear Icicle", type: "ice", category: "Highsec" },
  { id: "glacial-mass", name: "Glacial Mass", type: "ice", category: "Highsec" },
  { id: "white-glaze", name: "White Glaze", type: "ice", category: "Highsec" },
  { id: "glare-crust", name: "Glare Crust", type: "ice", category: "Nullsec / Wormhole" },
  { id: "dark-glitter", name: "Dark Glitter", type: "ice", category: "Nullsec / Wormhole" },
  { id: "gelidus", name: "Gelidus", type: "ice", category: "Nullsec / Wormhole" },
  { id: "krystallos", name: "Krystallos", type: "ice", category: "Nullsec / Wormhole" },
];

export const ORES_BY_ID: Record<string, Ore> = Object.fromEntries(
  ORES.map((o) => [o.id, o])
);

/** Index par nom (minuscule) pour retrouver la catégorie d'un minerai de base. */
export const ORES_BY_NAME: Record<string, Ore> = Object.fromEntries(
  ORES.map((o) => [o.name.toLowerCase(), o])
);

export interface OreCategoryInfo {
  type: BeltType | "other";
  category: string;
}

/** Noms (minuscule) des minerais lunaires de base, pour reconnaître leurs variantes. */
const MOON_BASE_NAMES = ORES.filter((o) => o.type === "moon").map((o) =>
  o.name.toLowerCase()
);

/** Catégorie d'un minerai à partir de son nom de base (ex : "Omber"). */
export function categoryForBase(base: string): OreCategoryInfo {
  const lb = base.toLowerCase();
  const ore = ORES_BY_NAME[lb];
  if (ore) return { type: ore.type, category: ore.category };
  // Variante lunaire (« Brimful Bitumens », « Glistening Zeolites »…) : le nom se
  // termine par un minerai lunaire connu → même catégorie, type « moon ».
  for (const moon of MOON_BASE_NAMES) {
    if (lb.endsWith(" " + moon)) {
      const o = ORES_BY_NAME[moon];
      return { type: "moon", category: o.category };
    }
  }
  return { type: "other", category: "Non catégorisé" };
}

export function oresForType(type: BeltType): Ore[] {
  return ORES.filter((o) => o.type === type);
}

/** Regroupe les minerais d'un type par catégorie, dans l'ordre d'apparition. */
export function oresByCategory(type: BeltType): { category: string; ores: Ore[] }[] {
  const groups: { category: string; ores: Ore[] }[] = [];
  const index = new Map<string, number>();
  for (const ore of oresForType(type)) {
    if (!index.has(ore.category)) {
      index.set(ore.category, groups.length);
      groups.push({ category: ore.category, ores: [] });
    }
    groups[index.get(ore.category)!].ores.push(ore);
  }
  return groups;
}
