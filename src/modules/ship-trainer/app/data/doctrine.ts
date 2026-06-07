/**
 * Doctrine raciale d'EVE Online — la base « apprenable » du Ship Recognition
 * Trainer. Ces tables encodent des **règles de conception canoniques** d'EVE
 * (vraies pour toutes les vaisseaux d'empire T1), ce qui rend l'entraînement
 * rigoureux : les faits dérivés (type de senseur, trou de résistance) ne sont
 * jamais inventés par vaisseau, ils découlent de la mécanique du jeu.
 *
 * ⚠️ Portée : empires T1 uniquement. Les vaisseaux pirates/faction (Guristas,
 * Angel, navy issue…) brisent volontairement ces règles (senseurs hybrides,
 * armes croisées) — on les exclut du dataset pour garder chaque déduction exacte.
 */

/** Les quatre empires jouables. */
export type Race = "Amarr" | "Caldari" | "Gallente" | "Minmatar";

/**
 * Type de senseur — **déterministe par race** (sert au brouillage ECM ciblé).
 * Amarr→Radar, Caldari→Gravimetric, Gallente→Magnetometric, Minmatar→Ladar.
 */
export type SensorType = "Radar" | "Gravimetric" | "Magnetometric" | "Ladar";

/** Système d'arme principal d'une vaisseau (déclaré par vaisseau, jamais deviné). */
export type Weapon =
  | "Energy" // Lasers (tourelles d'énergie)
  | "Hybrid" // Railguns / Blasters
  | "Missile" // Lanceurs
  | "Projectile" // Autocanons / Artillerie
  | "Drone" // Drones bonifiés
  | "EWAR" // Vaisseau de guerre électronique (pas d'arme bonifiée)
  | "Logistics"; // Vaisseau de soutien (réparation/cap)

/** Type de tank principal. */
export type Tank = "Armor" | "Shield";

/** Les quatre types de dégâts d'EVE. */
export type Damage = "EM" | "Thermal" | "Kinetic" | "Explosive";

/** Classe de vaisseau (taille / rôle). */
export type HullClass =
  | "Frigate"
  | "Destroyer"
  | "Cruiser"
  | "Battlecruiser"
  | "Battleship";

/**
 * Résistances de **base** d'un bouclier (mécanique EVE, identique sur toutes les
 * vaisseaux). Le bouclier est nu en EM → c'est son « trou » naturel.
 */
export const SHIELD_BASE_RESISTS: Record<Damage, number> = {
  EM: 0,
  Thermal: 20,
  Kinetic: 40,
  Explosive: 50,
};

/**
 * Résistances de **base** d'une armure (mécanique EVE, identique partout).
 * L'armure est faible en Explosif → son « trou » naturel.
 */
export const ARMOR_BASE_RESISTS: Record<Damage, number> = {
  EM: 50,
  Thermal: 45,
  Kinetic: 25,
  Explosive: 10,
};

/**
 * Trou de résistance naturel d'un type de tank (résistance de base la plus
 * faible). 100 % canonique : bouclier→EM, armure→Explosif. C'est *le* réflexe
 * que doit acquérir un pilote PvP pour choisir ses munitions.
 */
export function resistHole(tank: Tank): Damage {
  const base = tank === "Shield" ? SHIELD_BASE_RESISTS : ARMOR_BASE_RESISTS;
  return (Object.entries(base) as [Damage, number][]).reduce((lo, cur) =>
    cur[1] < lo[1] ? cur : lo,
  )[0];
}

/** Profil de doctrine d'un empire. */
export interface Doctrine {
  race: Race;
  /** Senseur — **certain** pour toute vaisseau d'empire. */
  sensor: SensorType;
  /** Arme la plus emblématique de l'empire (généralisation pédagogique). */
  signatureWeapon: Weapon;
  /** Tank le plus courant (généralisation — voir note Minmatar). */
  typicalTank: Tank;
  /** Types de dégâts privilégiés par l'empire. */
  dealsDamage: Damage[];
  /** Couleur d'accent indicative de l'empire (pour l'UI). */
  hint: string;
}

/** Table de doctrine, indexée par race. */
export const DOCTRINE: Record<Race, Doctrine> = {
  Amarr: {
    race: "Amarr",
    sensor: "Radar",
    signatureWeapon: "Energy",
    typicalTank: "Armor",
    dealsDamage: ["EM", "Thermal"],
    hint: "Lasers + armure, gros cap. Dégâts EM/Thermique.",
  },
  Caldari: {
    race: "Caldari",
    sensor: "Gravimetric",
    signatureWeapon: "Missile",
    typicalTank: "Shield",
    dealsDamage: ["Kinetic", "Thermal"],
    hint: "Missiles & railguns, bouclier, longue portée.",
  },
  Gallente: {
    race: "Gallente",
    sensor: "Magnetometric",
    signatureWeapon: "Hybrid",
    typicalTank: "Armor",
    dealsDamage: ["Thermal", "Kinetic"],
    hint: "Blasters & drones, armure, combat rapproché.",
  },
  Minmatar: {
    race: "Minmatar",
    sensor: "Ladar",
    // Tank Minmatar = volontairement mixte (bouclier OU armure selon la vaisseau) ;
    // « Shield » ici est une généralisation pédagogique seulement.
    signatureWeapon: "Projectile",
    typicalTank: "Shield",
    dealsDamage: ["Explosive", "Kinetic"],
    hint: "Autocanons/artillerie, polyvalent, rapide.",
  },
};

/** Senseur d'une vaisseau, dérivé de sa race (source unique de vérité). */
export function sensorOf(race: Race): SensorType {
  return DOCTRINE[race].sensor;
}

/** Toutes les races (ordre d'affichage stable). */
export const RACES: Race[] = ["Amarr", "Caldari", "Gallente", "Minmatar"];

/** Tous les types de senseurs (ordre stable pour les choix de quiz). */
export const SENSORS: SensorType[] = [
  "Radar",
  "Gravimetric",
  "Magnetometric",
  "Ladar",
];

/** Les cinq vrais systèmes d'arme (hors vaisseaux EWAR/Logi). */
export const WEAPON_SYSTEMS: Weapon[] = [
  "Energy",
  "Hybrid",
  "Missile",
  "Projectile",
  "Drone",
];

/** Libellés courts et neutres pour l'affichage des armes. */
export const WEAPON_LABEL: Record<Weapon, string> = {
  Energy: "Lasers",
  Hybrid: "Hybrides",
  Missile: "Missiles",
  Projectile: "Projectiles",
  Drone: "Drones",
  EWAR: "Guerre élec.",
  Logistics: "Soutien",
};
