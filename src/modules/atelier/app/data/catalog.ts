/**
 * Catalogue de modules pour le **générateur de fit**. Tous les noms sont des
 * noms de types EVE **exacts**, validés contre le SDE (`invTypes`, types publiés)
 * afin que l'ESI les résolve sans échec. Les variantes par taille (S/M/L) suivent
 * la taille de coque (attribut `rigSize`).
 */

export type Size = "S" | "M" | "L";
export type WeaponSystem = "hybrid" | "projectile" | "laser" | "missile" | "drone";
export type WeaponRange = "close" | "long";

type BySize<T = string> = Record<Size, T>;

/** Définition d'un système d'arme (par portée). */
export interface WeaponDef {
  hardpoint: "turret" | "launcher";
  /** Module d'arme par taille de coque. */
  weapon: BySize;
  /** Charge/munition par taille. */
  charge: BySize;
  /** Module d'amplification de dégâts (slot bas). */
  damageMod: string;
  /** Rig de dégâts par taille (slot rig). */
  rig: BySize;
}

/** Armes turret/launcher par système & portée. `drone` est traité à part. */
export const WEAPONS: Record<Exclude<WeaponSystem, "drone">, Record<WeaponRange, WeaponDef>> = {
  hybrid: {
    close: {
      hardpoint: "turret",
      weapon: { S: "Light Neutron Blaster II", M: "Heavy Neutron Blaster II", L: "Neutron Blaster Cannon II" },
      charge: { S: "Void S", M: "Void M", L: "Void L" },
      damageMod: "Magnetic Field Stabilizer II",
      rig: { S: "Small Hybrid Burst Aerator II", M: "Medium Hybrid Burst Aerator II", L: "Large Hybrid Burst Aerator II" },
    },
    long: {
      hardpoint: "turret",
      weapon: { S: "150mm Railgun II", M: "250mm Railgun II", L: "425mm Railgun II" },
      charge: { S: "Spike S", M: "Spike M", L: "Spike L" },
      damageMod: "Magnetic Field Stabilizer II",
      rig: { S: "Small Hybrid Burst Aerator II", M: "Medium Hybrid Burst Aerator II", L: "Large Hybrid Burst Aerator II" },
    },
  },
  projectile: {
    close: {
      hardpoint: "turret",
      weapon: { S: "200mm AutoCannon II", M: "425mm AutoCannon II", L: "800mm Repeating Cannon II" },
      charge: { S: "Hail S", M: "Hail M", L: "Hail L" },
      damageMod: "Gyrostabilizer II",
      rig: { S: "Small Projectile Burst Aerator II", M: "Medium Projectile Burst Aerator II", L: "Large Projectile Burst Aerator II" },
    },
    long: {
      hardpoint: "turret",
      weapon: { S: "280mm Howitzer Artillery II", M: "720mm Howitzer Artillery II", L: "1400mm Howitzer Artillery II" },
      charge: { S: "Quake S", M: "Quake M", L: "Quake L" },
      damageMod: "Gyrostabilizer II",
      rig: { S: "Small Projectile Burst Aerator II", M: "Medium Projectile Burst Aerator II", L: "Large Projectile Burst Aerator II" },
    },
  },
  laser: {
    close: {
      hardpoint: "turret",
      weapon: { S: "Dual Light Pulse Laser II", M: "Heavy Pulse Laser II", L: "Mega Pulse Laser II" },
      charge: { S: "Conflagration S", M: "Conflagration M", L: "Conflagration L" },
      damageMod: "Heat Sink II",
      rig: { S: "Small Energy Burst Aerator II", M: "Medium Energy Burst Aerator II", L: "Large Energy Burst Aerator II" },
    },
    long: {
      hardpoint: "turret",
      weapon: { S: "Quad Light Beam Laser II", M: "Heavy Beam Laser II", L: "Mega Beam Laser II" },
      charge: { S: "Aurora S", M: "Aurora M", L: "Aurora L" },
      damageMod: "Heat Sink II",
      rig: { S: "Small Energy Burst Aerator II", M: "Medium Energy Burst Aerator II", L: "Large Energy Burst Aerator II" },
    },
  },
  missile: {
    close: {
      hardpoint: "launcher",
      weapon: { S: "Rocket Launcher II", M: "Heavy Assault Missile Launcher II", L: "Torpedo Launcher II" },
      charge: { S: "Scourge Rage Rocket", M: "Scourge Rage Heavy Assault Missile", L: "Scourge Rage Torpedo" },
      damageMod: "Ballistic Control System II",
      rig: { S: "Small Warhead Calefaction Catalyst II", M: "Medium Warhead Calefaction Catalyst II", L: "Large Warhead Calefaction Catalyst II" },
    },
    long: {
      hardpoint: "launcher",
      weapon: { S: "Light Missile Launcher II", M: "Heavy Missile Launcher II", L: "Cruise Missile Launcher II" },
      charge: { S: "Scourge Fury Light Missile", M: "Scourge Fury Heavy Missile", L: "Scourge Fury Cruise Missile" },
      damageMod: "Ballistic Control System II",
      rig: { S: "Small Warhead Calefaction Catalyst II", M: "Medium Warhead Calefaction Catalyst II", L: "Large Warhead Calefaction Catalyst II" },
    },
  },
};

/** Drones par taille de coque (vol. m³ indicatif pour estimer la quantité). */
export const DRONES: BySize<{ name: string; volume: number }> = {
  S: { name: "Hobgoblin II", volume: 5 },
  M: { name: "Hammerhead II", volume: 10 },
  L: { name: "Ogre II", volume: 25 },
};

/** Modules de tank armure. */
export const ARMOR = {
  dcu: "Damage Control II",
  plate: { S: "200mm Steel Plates II", M: "800mm Steel Plates II", L: "1600mm Steel Plates II" } as BySize,
  plateMeta: {
    S: "200mm Crystalline Carbonide Restrained Plates",
    M: "800mm Crystalline Carbonide Restrained Plates",
    L: "1600mm Crystalline Carbonide Restrained Plates",
  } as BySize,
  rep: { S: "Small Armor Repairer II", M: "Medium Armor Repairer II", L: "Large Armor Repairer II" } as BySize,
  resist: "Multispectrum Energized Membrane II",
  hpRig: { S: "Small Trimark Armor Pump II", M: "Medium Trimark Armor Pump II", L: "Large Trimark Armor Pump II" } as BySize,
};

/** Modules de tank bouclier. */
export const SHIELD = {
  ext: { S: "Small Shield Extender II", M: "Medium Shield Extender II", L: "Large Shield Extender II" } as BySize,
  boost: { S: "Small Shield Booster II", M: "Medium Shield Booster II", L: "Large Shield Booster II" } as BySize,
  resist: "Multispectrum Shield Hardener II",
  resistMeta: "Compact Multispectrum Shield Hardener",
  hpRig: {
    S: "Small Core Defense Field Extender II",
    M: "Medium Core Defense Field Extender II",
    L: "Large Core Defense Field Extender II",
  } as BySize,
};

/** Propulsion. */
export const PROP = {
  ab: { S: "1MN Afterburner II", M: "10MN Afterburner II", L: "100MN Afterburner II" } as BySize,
  mwd: { S: "5MN Microwarpdrive II", M: "50MN Microwarpdrive II", L: "500MN Microwarpdrive II" } as BySize,
};

/** Tackle & utilitaires mid/high. */
export const UTIL = {
  scram: "Warp Scrambler II",
  point: "Warp Disruptor II",
  web: "Stasis Webifier II",
  capRecharger: "Cap Recharger II",
  capBooster: { S: "Small Capacitor Booster II", M: "Medium Capacitor Booster II", L: "Heavy Capacitor Booster II" } as BySize,
  neut: { S: "Small Energy Neutralizer II", M: "Medium Energy Neutralizer II", L: "Heavy Energy Neutralizer II" } as BySize,
};

/** Rigs d'encombrement (résolution des dépassements CPU/grille). */
export const FIT_RIG = {
  pg: { S: "Small Ancillary Current Router II", M: "Medium Ancillary Current Router II", L: "Large Ancillary Current Router II" } as BySize,
  cpu: { S: "Small Processor Overclocking Unit II", M: "Medium Processor Overclocking Unit II", L: "Large Processor Overclocking Unit II" } as BySize,
};

/** Modules bas d'aide à l'encombrement. */
export const FIT_LOW = {
  pg: "Reactor Control Unit II",
  cpu: "Co-Processor II",
};

/** Modules de **minage** (vaisseaux d'extraction). Noms validés SDE. */
export const MINING_CAT = {
  stripMiner: "Modulated Strip Miner II", // barges, exhumers, Orca/Rorqual
  miner: "Miner II", // frégates de minage (Venture, Prospect…)
  yieldLow: "Mining Laser Upgrade II", // bonus de rendement (slot bas)
  survey: "Survey Scanner II", // slot moyen
  miningDrone: "Mining Drone II",
};

/** Modules **industriels** (transport). Pas d'armement. */
export const INDUS_CAT = {
  cargo: "Expanded Cargohold II", // soute (slot bas)
  bulkhead: "Reinforced Bulkheads II", // PV structure (slot bas)
  wcs: "Warp Core Stabilizer II", // anti-tackle (slot bas)
  inertia: "Inertial Stabilizers II", // alignement (slot bas)
};
