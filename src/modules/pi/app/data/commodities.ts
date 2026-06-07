/**
 * Données de domaine **Planetary Industry** d'EVE Online.
 *
 * Sources :
 * - Matrice planète → P0 et chaînes P0→P1→P2→P3→P4 : EVE University
 *   (wiki.eveuniversity.org/Planetary_Commodities).
 * - Débits d'usine standard : P1 3000→20 / 30 min ; P2 40+40→5 / 60 min ;
 *   P3 (2-3 entrées ×10)→3 / 60 min ; P4 (×6 P3, ×40 P1)→1 / 60 min.
 *
 * Les ids sont des slugs stables (indépendants de la langue). Les noms affichés
 * sont en anglais (noms canoniques EVE, identiques in-game pour l'export).
 */

export type Tier = 0 | 1 | 2 | 3 | 4;

export type PlanetType =
  | "barren"
  | "gas"
  | "ice"
  | "lava"
  | "oceanic"
  | "plasma"
  | "storm"
  | "temperate";

export interface PlanetInfo {
  id: PlanetType;
  name: string;
  /** Accent CSS (cohérent avec le thème). */
  accent: string;
}

export const PLANETS: PlanetInfo[] = [
  { id: "barren", name: "Barren", accent: "30 30% 60%" },
  { id: "gas", name: "Gas", accent: "190 60% 55%" },
  { id: "ice", name: "Ice", accent: "205 70% 70%" },
  { id: "lava", name: "Lava", accent: "12 80% 55%" },
  { id: "oceanic", name: "Oceanic", accent: "210 70% 55%" },
  { id: "plasma", name: "Plasma", accent: "300 60% 60%" },
  { id: "storm", name: "Storm", accent: "260 60% 65%" },
  { id: "temperate", name: "Temperate", accent: "130 45% 55%" },
];

/** Une marchandise PI (tier 0 à 4). */
export interface Commodity {
  id: string;
  name: string;
  tier: Tier;
}

/** Schématique d'usine : entrées → sortie, durée de cycle (s). */
export interface Schematic {
  /** id de la marchandise produite. */
  output: string;
  outputQty: number;
  cycleSec: number;
  inputs: { id: string; qty: number }[];
}

// --- P0 (matières brutes) et leur disponibilité par type de planète ----------

const P0: Record<string, { name: string; planets: PlanetType[] }> = {
  aqueous_liquids: {
    name: "Aqueous Liquids",
    planets: ["barren", "gas", "ice", "oceanic", "storm", "temperate"],
  },
  autotrophs: { name: "Autotrophs", planets: ["temperate"] },
  base_metals: {
    name: "Base Metals",
    planets: ["barren", "gas", "lava", "plasma", "storm"],
  },
  carbon_compounds: {
    name: "Carbon Compounds",
    planets: ["barren", "oceanic", "temperate"],
  },
  complex_organisms: {
    name: "Complex Organisms",
    planets: ["oceanic", "temperate"],
  },
  felsic_magma: { name: "Felsic Magma", planets: ["lava"] },
  heavy_metals: { name: "Heavy Metals", planets: ["ice", "lava", "plasma"] },
  ionic_solutions: { name: "Ionic Solutions", planets: ["gas", "storm"] },
  microorganisms: {
    name: "Microorganisms",
    planets: ["barren", "ice", "oceanic", "temperate"],
  },
  noble_gas: { name: "Noble Gas", planets: ["gas", "ice", "storm"] },
  noble_metals: { name: "Noble Metals", planets: ["barren", "plasma"] },
  non_cs_crystals: { name: "Non-CS Crystals", planets: ["lava", "plasma"] },
  planktic_colonies: { name: "Planktic Colonies", planets: ["ice", "oceanic"] },
  reactive_gas: { name: "Reactive Gas", planets: ["gas"] },
  suspended_plasma: {
    name: "Suspended Plasma",
    planets: ["lava", "plasma", "storm"],
  },
};

// --- P1 (matières transformées) : 1 P0 (3000) → 20, cycle 30 min -------------

const P1: Record<string, { name: string; from: string }> = {
  bacteria: { name: "Bacteria", from: "microorganisms" },
  biofuels: { name: "Biofuels", from: "carbon_compounds" },
  biomass: { name: "Biomass", from: "planktic_colonies" },
  chiral_structures: { name: "Chiral Structures", from: "non_cs_crystals" },
  electrolytes: { name: "Electrolytes", from: "ionic_solutions" },
  industrial_fibers: { name: "Industrial Fibers", from: "autotrophs" },
  oxidizing_compound: { name: "Oxidizing Compound", from: "reactive_gas" },
  oxygen: { name: "Oxygen", from: "noble_gas" },
  plasmoids: { name: "Plasmoids", from: "suspended_plasma" },
  precious_metals: { name: "Precious Metals", from: "noble_metals" },
  proteins: { name: "Proteins", from: "complex_organisms" },
  reactive_metals: { name: "Reactive Metals", from: "base_metals" },
  silicon: { name: "Silicon", from: "felsic_magma" },
  toxic_metals: { name: "Toxic Metals", from: "heavy_metals" },
  water: { name: "Water", from: "aqueous_liquids" },
};

// --- P2 (raffinées) : 2 P1 (40 chacun) → 5, cycle 60 min ---------------------

const P2: Record<string, { name: string; inputs: [string, string] }> = {
  biocells: { name: "Biocells", inputs: ["precious_metals", "biofuels"] },
  construction_blocks: {
    name: "Construction Blocks",
    inputs: ["toxic_metals", "reactive_metals"],
  },
  consumer_electronics: {
    name: "Consumer Electronics",
    inputs: ["chiral_structures", "toxic_metals"],
  },
  coolant: { name: "Coolant", inputs: ["water", "electrolytes"] },
  enriched_uranium: {
    name: "Enriched Uranium",
    inputs: ["toxic_metals", "precious_metals"],
  },
  fertilizer: { name: "Fertilizer", inputs: ["proteins", "bacteria"] },
  gen_livestock: {
    name: "Genetically Enhanced Livestock",
    inputs: ["biomass", "proteins"],
  },
  livestock: { name: "Livestock", inputs: ["biofuels", "proteins"] },
  mechanical_parts: {
    name: "Mechanical Parts",
    inputs: ["precious_metals", "reactive_metals"],
  },
  microfiber_shielding: {
    name: "Microfiber Shielding",
    inputs: ["silicon", "industrial_fibers"],
  },
  miniature_electronics: {
    name: "Miniature Electronics",
    inputs: ["silicon", "chiral_structures"],
  },
  nanites: { name: "Nanites", inputs: ["reactive_metals", "bacteria"] },
  oxides: { name: "Oxides", inputs: ["oxygen", "oxidizing_compound"] },
  polyaramids: {
    name: "Polyaramids",
    inputs: ["industrial_fibers", "oxidizing_compound"],
  },
  polytextiles: {
    name: "Polytextiles",
    inputs: ["industrial_fibers", "biofuels"],
  },
  rocket_fuel: { name: "Rocket Fuel", inputs: ["electrolytes", "plasmoids"] },
  silicate_glass: {
    name: "Silicate Glass",
    inputs: ["silicon", "oxidizing_compound"],
  },
  superconductors: { name: "Superconductors", inputs: ["water", "plasmoids"] },
  supertensile_plastics: {
    name: "Supertensile Plastics",
    inputs: ["biomass", "oxygen"],
  },
  synthetic_oil: { name: "Synthetic Oil", inputs: ["oxygen", "electrolytes"] },
  test_cultures: { name: "Test Cultures", inputs: ["water", "bacteria"] },
  transmitter: { name: "Transmitter", inputs: ["chiral_structures", "plasmoids"] },
  viral_agent: { name: "Viral Agent", inputs: ["biomass", "bacteria"] },
  water_cooled_cpu: {
    name: "Water-Cooled CPU",
    inputs: ["water", "reactive_metals"],
  },
};

// --- P3 (spécialisées) : 2-3 P2 (10 chacun) → 3, cycle 60 min ----------------

const P3: Record<string, { name: string; inputs: string[] }> = {
  biotech_research_reports: {
    name: "Biotech Research Reports",
    inputs: ["nanites", "livestock", "construction_blocks"],
  },
  camera_drones: {
    name: "Camera Drones",
    inputs: ["silicate_glass", "rocket_fuel"],
  },
  condensates: { name: "Condensates", inputs: ["oxides", "coolant"] },
  cryoprotectant_solution: {
    name: "Cryoprotectant Solution",
    inputs: ["test_cultures", "synthetic_oil", "fertilizer"],
  },
  data_chips: {
    name: "Data Chips",
    inputs: ["supertensile_plastics", "microfiber_shielding"],
  },
  gel_matrix_biopaste: {
    name: "Gel-Matrix Biopaste",
    inputs: ["oxides", "biocells", "superconductors"],
  },
  guidance_systems: {
    name: "Guidance Systems",
    inputs: ["water_cooled_cpu", "transmitter"],
  },
  hazmat_detection_systems: {
    name: "Hazmat Detection Systems",
    inputs: ["polytextiles", "viral_agent", "transmitter"],
  },
  hermetic_membranes: {
    name: "Hermetic Membranes",
    inputs: ["polyaramids", "gen_livestock"],
  },
  high_tech_transmitters: {
    name: "High-Tech Transmitters",
    inputs: ["polyaramids", "transmitter"],
  },
  industrial_explosives: {
    name: "Industrial Explosives",
    inputs: ["fertilizer", "polytextiles"],
  },
  integrity_response_drones: {
    name: "Integrity Response Drones",
    inputs: ["supertensile_plastics", "mechanical_parts", "miniature_electronics"],
  },
  neocoms: { name: "Neocoms", inputs: ["biocells", "silicate_glass"] },
  nuclear_reactors: {
    name: "Nuclear Reactors",
    inputs: ["microfiber_shielding", "enriched_uranium"],
  },
  organic_mortar_applicators: {
    name: "Organic Mortar Applicators",
    inputs: ["mechanical_parts", "consumer_electronics"],
  },
  planetary_vehicles: {
    name: "Planetary Vehicles",
    inputs: ["supertensile_plastics", "mechanical_parts", "miniature_electronics"],
  },
  recursive_computing_module: {
    name: "Recursive Computing Module",
    inputs: ["water_cooled_cpu", "coolant", "consumer_electronics"],
  },
  robotics: {
    name: "Robotics",
    inputs: ["mechanical_parts", "consumer_electronics"],
  },
  smartfab_units: {
    name: "Smartfab Units",
    inputs: ["construction_blocks", "miniature_electronics"],
  },
  supercomputers: {
    name: "Supercomputers",
    inputs: ["water_cooled_cpu", "coolant", "consumer_electronics"],
  },
  synthetic_synapses: {
    name: "Synthetic Synapses",
    inputs: ["supertensile_plastics", "test_cultures"],
  },
  transcranial_microcontrollers: {
    name: "Transcranial Microcontrollers",
    inputs: ["biocells", "nanites"],
  },
  ukomi_superconductors: {
    name: "Ukomi Superconductors",
    inputs: ["synthetic_oil", "superconductors"],
  },
  vaccines: { name: "Vaccines", inputs: ["livestock", "viral_agent"] },
};

// --- P4 (avancées) : 3 entrées (P3 ×6, P1 ×40) → 1, cycle 60 min -------------

const P4: Record<string, { name: string; inputs: string[] }> = {
  broadcast_node: {
    name: "Broadcast Node",
    inputs: ["neocoms", "data_chips", "high_tech_transmitters"],
  },
  integrity_response_drones_p4: {
    name: "Integrity Response Drones",
    inputs: ["gel_matrix_biopaste", "hazmat_detection_systems", "planetary_vehicles"],
  },
  nano_factory: {
    name: "Nano-Factory",
    inputs: ["industrial_explosives", "ukomi_superconductors", "reactive_metals"],
  },
  organic_mortar_applicators_p4: {
    name: "Organic Mortar Applicators",
    inputs: ["condensates", "robotics", "bacteria"],
  },
  recursive_computing_module_p4: {
    name: "Recursive Computing Module",
    inputs: ["synthetic_synapses", "guidance_systems", "transcranial_microcontrollers"],
  },
  self_harmonizing_power_core: {
    name: "Self-Harmonizing Power Core",
    inputs: ["camera_drones", "nuclear_reactors", "hermetic_membranes"],
  },
  sterile_conduits: {
    name: "Sterile Conduits",
    inputs: ["smartfab_units", "vaccines", "water"],
  },
  wetware_mainframe: {
    name: "Wetware Mainframe",
    inputs: ["supercomputers", "biotech_research_reports", "cryoprotectant_solution"],
  },
};

// --- Assemblage : table de marchandises + schematics --------------------------

const COMMODITIES = new Map<string, Commodity>();
const SCHEMATICS = new Map<string, Schematic>();
const P1_TIER = new Set(Object.keys(P1));

for (const [id, v] of Object.entries(P0))
  COMMODITIES.set(id, { id, name: v.name, tier: 0 });
for (const [id, v] of Object.entries(P1)) {
  COMMODITIES.set(id, { id, name: v.name, tier: 1 });
  SCHEMATICS.set(id, {
    output: id,
    outputQty: 20,
    cycleSec: 1800,
    inputs: [{ id: v.from, qty: 3000 }],
  });
}
for (const [id, v] of Object.entries(P2)) {
  COMMODITIES.set(id, { id, name: v.name, tier: 2 });
  SCHEMATICS.set(id, {
    output: id,
    outputQty: 5,
    cycleSec: 3600,
    inputs: v.inputs.map((i) => ({ id: i, qty: 40 })),
  });
}
for (const [id, v] of Object.entries(P3)) {
  COMMODITIES.set(id, { id, name: v.name, tier: 3 });
  SCHEMATICS.set(id, {
    output: id,
    outputQty: 3,
    cycleSec: 3600,
    inputs: v.inputs.map((i) => ({ id: i, qty: 10 })),
  });
}
for (const [id, v] of Object.entries(P4)) {
  COMMODITIES.set(id, { id, name: v.name, tier: 4 });
  SCHEMATICS.set(id, {
    output: id,
    outputQty: 1,
    cycleSec: 3600,
    // Entrée P1 (ex. Reactive Metals, Water, Bacteria) → 40 ; entrée P3 → 6.
    inputs: v.inputs.map((i) => ({ id: i, qty: P1_TIER.has(i) ? 40 : 6 })),
  });
}

// --- API publique -------------------------------------------------------------

export function commodity(id: string): Commodity | undefined {
  return COMMODITIES.get(id);
}
export function commodityName(id: string): string {
  return COMMODITIES.get(id)?.name ?? id;
}
export function schematic(id: string): Schematic | undefined {
  return SCHEMATICS.get(id);
}
export function allCommodities(): Commodity[] {
  return [...COMMODITIES.values()];
}

/** P0 disponibles sur un type de planète. */
export function rawsForPlanet(planet: PlanetType): Commodity[] {
  return Object.entries(P0)
    .filter(([, v]) => v.planets.includes(planet))
    .map(([id, v]) => ({ id, name: v.name, tier: 0 as Tier }));
}

/** Types de planète produisant un P0 donné. */
export function planetsForRaw(rawId: string): PlanetType[] {
  return P0[rawId]?.planets ?? [];
}

/** P1 issu d'un P0 (chaque P0 a exactement un P1). */
export function p1FromRaw(rawId: string): Commodity | undefined {
  const found = Object.entries(P1).find(([, v]) => v.from === rawId);
  return found ? { id: found[0], name: found[1].name, tier: 1 } : undefined;
}

/** P2 dont les deux entrées P1 sont fournies (au moins une issue de `p1Id`). */
export function p2UsingP1(p1Id: string): Commodity[] {
  return Object.entries(P2)
    .filter(([, v]) => v.inputs.includes(p1Id))
    .map(([id, v]) => ({ id, name: v.name, tier: 2 as Tier }));
}
