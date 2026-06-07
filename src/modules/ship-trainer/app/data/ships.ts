/**
 * Dataset de vaisseaux pour le Ship Recognition Trainer.
 *
 * Provenance : EVE Static Data Export (SDE) — table `invTypes` (typeID), tel que
 * publié par CCP et indexé par Fuzzwork. Les `typeId` servent uniquement à
 * charger le rendu officiel via `images.evetech.net` (CDN CCP). Données 100 %
 * statiques : aucun appel ESI, aucune interaction avec le client (EULA-safe).
 *
 * Portée volontaire : **vaisseaux d'empire T1**, frégate → cuirassé, les quatre
 * races. On exclut T2/T3/faction/pirate pour que chaque attribut dérivé
 * (senseur par race, trou de résistance par tank) reste exact sans exception.
 *
 * Étendre = ajouter une ligne (id + race + classe + arme + tank + rôle). Le
 * senseur n'est PAS stocké : il est dérivé de la race (cf. `doctrine.ts`).
 */
import type { HullClass, Race, Tank, Weapon } from "./doctrine";

export interface Ship {
  /** typeID SDE — clé du rendu `images.evetech.net/types/<id>/render`. */
  typeId: number;
  name: string;
  race: Race;
  class: HullClass;
  /** Système d'arme principal (bonifié par la vaisseau). */
  weapon: Weapon;
  /** Tank bonifié/typique de la vaisseau (résistances ou HP). */
  tank: Tank;
  /** Rôle court (FR) affiché sur la fiche. */
  role: string;
}

export const SHIPS: Ship[] = [
  // ───────────────────────── Frégates ─────────────────────────
  { typeId: 597, name: "Punisher", race: "Amarr", class: "Frigate", weapon: "Energy", tank: "Armor", role: "Frégate de combat" },
  { typeId: 591, name: "Tormentor", race: "Amarr", class: "Frigate", weapon: "Energy", tank: "Armor", role: "Frégate d'attaque (drones)" },
  { typeId: 589, name: "Executioner", race: "Amarr", class: "Frigate", weapon: "Energy", tank: "Armor", role: "Frégate d'interception rapide" },
  { typeId: 603, name: "Merlin", race: "Caldari", class: "Frigate", weapon: "Hybrid", tank: "Shield", role: "Frégate de combat" },
  { typeId: 602, name: "Kestrel", race: "Caldari", class: "Frigate", weapon: "Missile", tank: "Shield", role: "Frégate lance-missiles" },
  { typeId: 583, name: "Condor", race: "Caldari", class: "Frigate", weapon: "Missile", tank: "Shield", role: "Frégate de tackle rapide" },
  { typeId: 594, name: "Incursus", race: "Gallente", class: "Frigate", weapon: "Hybrid", tank: "Armor", role: "Frégate de combat rapproché" },
  { typeId: 593, name: "Tristan", race: "Gallente", class: "Frigate", weapon: "Drone", tank: "Armor", role: "Frégate à drones" },
  { typeId: 608, name: "Atron", race: "Gallente", class: "Frigate", weapon: "Hybrid", tank: "Shield", role: "Frégate d'attaque rapide" },
  { typeId: 587, name: "Rifter", race: "Minmatar", class: "Frigate", weapon: "Projectile", tank: "Armor", role: "Frégate de combat polyvalente" },
  { typeId: 598, name: "Breacher", race: "Minmatar", class: "Frigate", weapon: "Missile", tank: "Shield", role: "Frégate lance-missiles" },
  { typeId: 585, name: "Slasher", race: "Minmatar", class: "Frigate", weapon: "Projectile", tank: "Shield", role: "Frégate de tackle rapide" },

  // ──────────────────────── Destroyers ────────────────────────
  { typeId: 16236, name: "Coercer", race: "Amarr", class: "Destroyer", weapon: "Energy", tank: "Armor", role: "Destroyer à lasers (alpha)" },
  { typeId: 16238, name: "Cormorant", race: "Caldari", class: "Destroyer", weapon: "Hybrid", tank: "Shield", role: "Destroyer à railguns (portée)" },
  { typeId: 16240, name: "Catalyst", race: "Gallente", class: "Destroyer", weapon: "Hybrid", tank: "Shield", role: "Destroyer à blasters (gank)" },
  { typeId: 16242, name: "Thrasher", race: "Minmatar", class: "Destroyer", weapon: "Projectile", tank: "Shield", role: "Destroyer artillerie/autocanons" },

  // ───────────────────────── Croiseurs ────────────────────────
  { typeId: 624, name: "Maller", race: "Amarr", class: "Cruiser", weapon: "Energy", tank: "Armor", role: "Croiseur de combat blindé" },
  { typeId: 2006, name: "Omen", race: "Amarr", class: "Cruiser", weapon: "Energy", tank: "Armor", role: "Croiseur d'attaque à lasers" },
  { typeId: 628, name: "Arbitrator", race: "Amarr", class: "Cruiser", weapon: "Drone", tank: "Armor", role: "Croiseur EWAR/drones" },
  { typeId: 621, name: "Caracal", race: "Caldari", class: "Cruiser", weapon: "Missile", tank: "Shield", role: "Croiseur lance-missiles (portée)" },
  { typeId: 623, name: "Moa", race: "Caldari", class: "Cruiser", weapon: "Hybrid", tank: "Shield", role: "Croiseur à railguns/blasters" },
  { typeId: 627, name: "Thorax", race: "Gallente", class: "Cruiser", weapon: "Hybrid", tank: "Armor", role: "Croiseur blasters (rapproché)" },
  { typeId: 626, name: "Vexor", race: "Gallente", class: "Cruiser", weapon: "Drone", tank: "Armor", role: "Croiseur à drones" },
  { typeId: 622, name: "Stabber", race: "Minmatar", class: "Cruiser", weapon: "Projectile", tank: "Shield", role: "Croiseur rapide (autocanons)" },
  { typeId: 629, name: "Rupture", race: "Minmatar", class: "Cruiser", weapon: "Projectile", tank: "Armor", role: "Croiseur de combat polyvalent" },

  // ──────────────────────── Croiseurs de bataille ─────────────
  { typeId: 24696, name: "Harbinger", race: "Amarr", class: "Battlecruiser", weapon: "Energy", tank: "Armor", role: "BC à lasers (DPS)" },
  { typeId: 24698, name: "Drake", race: "Caldari", class: "Battlecruiser", weapon: "Missile", tank: "Shield", role: "BC à missiles (tank)" },
  { typeId: 16227, name: "Ferox", race: "Caldari", class: "Battlecruiser", weapon: "Hybrid", tank: "Shield", role: "BC à railguns (doctrine flotte)" },
  { typeId: 16229, name: "Brutix", race: "Gallente", class: "Battlecruiser", weapon: "Hybrid", tank: "Armor", role: "BC à blasters (brawl)" },
  { typeId: 24700, name: "Myrmidon", race: "Gallente", class: "Battlecruiser", weapon: "Drone", tank: "Armor", role: "BC à drones (tank)" },
  { typeId: 24702, name: "Hurricane", race: "Minmatar", class: "Battlecruiser", weapon: "Projectile", tank: "Armor", role: "BC polyvalent (autocanons)" },

  // ───────────────────────── Cuirassés ────────────────────────
  { typeId: 642, name: "Apocalypse", race: "Amarr", class: "Battleship", weapon: "Energy", tank: "Armor", role: "Cuirassé lasers longue portée" },
  { typeId: 24692, name: "Abaddon", race: "Amarr", class: "Battleship", weapon: "Energy", tank: "Armor", role: "Cuirassé lasers (gros tank)" },
  { typeId: 638, name: "Raven", race: "Caldari", class: "Battleship", weapon: "Missile", tank: "Shield", role: "Cuirassé à missiles (PvE/PvP)" },
  { typeId: 24688, name: "Rokh", race: "Caldari", class: "Battleship", weapon: "Hybrid", tank: "Shield", role: "Cuirassé railguns ultra-portée" },
  { typeId: 641, name: "Megathron", race: "Gallente", class: "Battleship", weapon: "Hybrid", tank: "Armor", role: "Cuirassé hybrides (DPS)" },
  { typeId: 24690, name: "Hyperion", race: "Gallente", class: "Battleship", weapon: "Hybrid", tank: "Armor", role: "Cuirassé blasters (brawl)" },
  { typeId: 645, name: "Dominix", race: "Gallente", class: "Battleship", weapon: "Drone", tank: "Armor", role: "Cuirassé à drones" },
  { typeId: 639, name: "Tempest", race: "Minmatar", class: "Battleship", weapon: "Projectile", tank: "Armor", role: "Cuirassé polyvalent" },
  { typeId: 24694, name: "Maelstrom", race: "Minmatar", class: "Battleship", weapon: "Projectile", tank: "Shield", role: "Cuirassé artillerie (alpha)" },
  { typeId: 644, name: "Typhoon", race: "Minmatar", class: "Battleship", weapon: "Missile", tank: "Armor", role: "Cuirassé missiles/drones" },
];

/** Ordre d'affichage des classes (frégate → cuirassé). */
export const CLASS_ORDER: HullClass[] = [
  "Frigate",
  "Destroyer",
  "Cruiser",
  "Battlecruiser",
  "Battleship",
];

/** Libellés FR des classes. */
export const CLASS_LABEL: Record<HullClass, string> = {
  Frigate: "Frégate",
  Destroyer: "Destroyer",
  Cruiser: "Croiseur",
  Battlecruiser: "Croiseur de bataille",
  Battleship: "Cuirassé",
};

/** Recherche d'une vaisseau par typeId (pour l'UI). */
export function shipById(typeId: number): Ship | undefined {
  return SHIPS.find((s) => s.typeId === typeId);
}
