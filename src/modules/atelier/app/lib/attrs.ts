/**
 * Constantes **dogma** EVE (attributs & effets), vérifiées contre le SDE
 * (`dgmAttributeTypes`). Le moteur lit les `dogma_attributes` renvoyés par
 * l'ESI `/universe/types/{id}/` — qui sont indexés par `attribute_id` numérique.
 */

/** IDs d'attributs dogma utilisés par l'Atelier. */
export const ATTR = {
  // — Vaisseau : points de vie —
  shieldCapacity: 263,
  armorHP: 265,
  structureHP: 9,

  // — Résonances bouclier (multiplicateur 0..1 ; résist% = 1 − valeur) —
  shieldEm: 271,
  shieldTh: 274,
  shieldKin: 273,
  shieldExp: 272,
  // — Résonances armure —
  armorEm: 267,
  armorTh: 270,
  armorKin: 269,
  armorExp: 268,
  // — Résonances structure —
  hullEm: 113,
  hullTh: 110,
  hullKin: 109,
  hullExp: 111,

  // — Bonus de PV plats (sans pénalité d'empilement) —
  shieldHpBonus: 72, // extension de bouclier
  armorHpBonus: 1159, // plaque d'armure

  // — Condensateur —
  capCapacity: 482,
  capRechargeTime: 55, // ms pour recharge complète
  capacitorNeed: 6, // coût d'activation d'un module
  duration: 73, // temps d'activation (ms)
  capBonus: 67, // batterie de condensateur (PV cap plats)

  // — Navigation —
  maxVelocity: 37,
  mass: 4,
  inertia: 70, // « agility »
  massAddition: 796, // ajout de masse (plaque)
  warpSpeedMul: 600,
  velocityBonus: 20, // bonus % de vitesse (AB/MWD)
  signatureRadius: 552,
  scanResolution: 564,

  // — Capacité d'emport / drones —
  droneBandwidth: 1271,
  droneCapacity: 283,

  // — Encombrement (fitting) —
  cpuOutput: 48, // « CPU Output » de la vaisseau (49 = « CPU Load », à ne pas confondre)
  cpuUsage: 50,
  pgOutput: 11,
  pgUsage: 30,
  hiSlots: 14,
  medSlots: 13,
  lowSlots: 12,
  rigSlots: 1137,
  calibration: 1132, // capacité d'amélioration de la vaisseau
  calibrationCost: 1153, // coût d'un rig
  // Bonus d'encombrement portés par certains modules/rigs (sortie vaisseau) :
  cpuOutputMul: 202, // Co-Processor — multiplicateur (ex. 1.10)
  pgOutputMul: 145, // Reactor Control Unit / PDS — multiplicateur (ex. 1.15)
  cpuOutputPct: 424, // rig Processor Overclocking Unit — pourcentage (ex. 9.6)
  pgOutputPct: 313, // rig Ancillary Current Router — pourcentage (ex. 15)
  turretHardpoints: 102,
  launcherHardpoints: 101,

  // — Armement —
  damageMultiplier: 64,
  rateOfFire: 51, // ms
  emDamage: 114,
  expDamage: 116,
  kinDamage: 117,
  thDamage: 118,
} as const;

/** IDs d'effets dogma qui déterminent le slot d'un module. */
export const EFFECT_SLOT: Record<number, "low" | "high" | "mid" | "rig" | "subsystem"> = {
  11: "low",
  12: "high",
  13: "mid",
  2663: "rig",
  3772: "subsystem",
};

/** Les quatre types de dégâts, dans l'ordre canonique EVE. */
export const DAMAGE_TYPES = ["em", "th", "kin", "exp"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Mapping (couche, type de dégât) → attribut de résonance correspondant. */
export const RESONANCE: Record<"shield" | "armor" | "hull", Record<DamageType, number>> = {
  shield: { em: ATTR.shieldEm, th: ATTR.shieldTh, kin: ATTR.shieldKin, exp: ATTR.shieldExp },
  armor: { em: ATTR.armorEm, th: ATTR.armorTh, kin: ATTR.armorKin, exp: ATTR.armorExp },
  hull: { em: ATTR.hullEm, th: ATTR.hullTh, kin: ATTR.hullKin, exp: ATTR.hullExp },
};

/** Attribut de dégât par type (sur une charge / un drone / un module). */
export const DAMAGE_ATTR: Record<DamageType, number> = {
  em: ATTR.emDamage,
  th: ATTR.thDamage,
  kin: ATTR.kinDamage,
  exp: ATTR.expDamage,
};
