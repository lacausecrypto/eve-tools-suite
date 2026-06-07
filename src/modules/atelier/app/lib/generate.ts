/**
 * **Générateur de fit** — heuristique par rôle. À partir d'un besoin (vaisseau,
 * rôle, tank, système d'arme, portée) et des caractéristiques de la vaisseau
 * (slots, hardpoints, drones, CPU/grille via ESI), il compose un loadout
 * complet, l'assemble en EFT, puis l'analyse. Une **boucle de faisabilité**
 * corrige les dépassements CPU/grille (rigs ACR/POU, modules d'aide, allègement
 * de plaque) tant que le fit n'est pas montable.
 *
 * `buildLoadout` et `assembleEft` sont **purs** (testables au Node) ; seul
 * `generateFit` touche au réseau.
 */
import { ATTR } from "./attrs";
import { bonusTankLayer, bonusWeapon } from "./bonuses";
import type { EsiType } from "./types";
import {
  ARMOR,
  DRONES,
  INDUS_CAT,
  MINING_CAT,
  PROP,
  SHIELD,
  UTIL,
  WEAPONS,
  type Size,
  type WeaponRange,
  type WeaponSystem,
} from "../data/catalog";
import { HULL_KIND } from "../data/hullkind";

export type Role = "ratting" | "mission" | "abyssal" | "brawl" | "kite" | "tackle" | "mining" | "explore";

/** Rôles disponibles. Le libellé est rendu via `t("atelier.role." + id)`. */
export const ROLES: { id: Role }[] = [
  { id: "ratting" },
  { id: "mission" },
  { id: "abyssal" },
  { id: "brawl" },
  { id: "kite" },
  { id: "tackle" },
  { id: "mining" },
  { id: "explore" },
];

export interface GenNeed {
  hull: string;
  role: Role;
  tank: "auto" | "armor" | "shield";
  weapon: "auto" | WeaponSystem;
  range: WeaponRange;
}

export interface WeaponLine {
  name: string;
  charge?: string;
}

export interface Loadout {
  size: Size;
  system: WeaponSystem | "mining" | "industrial";
  tank: "armor" | "shield";
  highs: WeaponLine[];
  mids: string[];
  lows: string[];
  rigs: string[];
  drones: { name: string; qty: number }[];
}

const at = (t: EsiType, id: number, d = 0) => t.attrs[id] ?? d;

function hullSize(hull: EsiType): Size {
  const rs = at(hull, 1547); // rigSize : 1=S, 2=M, 3=L
  return rs >= 3 ? "L" : rs <= 1 ? "S" : "M";
}

function resolveSystem(need: GenNeed, hull: EsiType, size: Size): WeaponSystem {
  if (need.weapon !== "auto") return need.weapon;
  // 1) Signal le plus fiable : le système d'arme bonusé par les traits de vaisseau.
  const bonused = bonusWeapon(hull.name);
  if (bonused) {
    // Vérifie que la vaisseau a bien le hardpoint/soute correspondant.
    if (bonused === "drone" && at(hull, ATTR.droneCapacity) > 0) return "drone";
    if (bonused === "missile" && at(hull, ATTR.launcherHardpoints) > 0) return "missile";
    if (bonused !== "drone" && bonused !== "missile" && at(hull, ATTR.turretHardpoints) > 0) return bonused;
  }
  // 2) Repli heuristique (vaisseau non répertoriée) : hardpoints + soute à drones.
  const turrets = at(hull, ATTR.turretHardpoints);
  const launchers = at(hull, ATTR.launcherHardpoints);
  const droneBW = at(hull, ATTR.droneBandwidth);
  const droneBay = at(hull, ATTR.droneCapacity);
  const droneFlight = DRONES[size].volume * 5;
  // Vaisseau à drones marquée : large bande passante, peu de hardpoints.
  if (droneBW > 0 && droneBay >= droneFlight * 0.8 && turrets + launchers <= 2) return "drone";
  if (launchers > turrets) return "missile";
  if (turrets > 0) return "hybrid";
  if (droneBW > 0) return "drone";
  return "missile";
}

function resolveTank(need: GenNeed, hull: EsiType): "armor" | "shield" {
  if (need.tank !== "auto") return need.tank;
  // Si la vaisseau a un bonus de tank (résist/PV) sur une couche, on la suit.
  const layer = bonusTankLayer(hull.name);
  if (layer) return layer;
  return need.role === "kite" || need.role === "tackle" || need.role === "mining" || need.role === "explore"
    ? "shield"
    : "armor";
}

/** Type de vaisseau (combat / minage / industriel). */
export function hullKind(hull: EsiType): "combat" | "mining" | "industrial" | "unsupported" {
  return HULL_KIND[hull.name.toLowerCase()] ?? "combat";
}

/** Compose un loadout complet (pur) à partir des stats de vaisseau. */
export function buildLoadout(need: GenNeed, hull: EsiType): Loadout {
  // Router selon le **rôle réel** de la vaisseau : un Hulk se monte en minage, pas
  // en DPS ; un cargo en transport. Le générateur de combat ne s'applique qu'aux
  // vaisseaux de combat.
  const kind = hullKind(hull);
  if (kind === "mining") return buildMiningLoadout(hull);
  if (kind === "industrial") return buildHaulerLoadout(hull);

  const size = hullSize(hull);
  const system = resolveSystem(need, hull, size);
  const tank = resolveTank(need, hull);

  const hiN = at(hull, ATTR.hiSlots);
  const midN = at(hull, ATTR.medSlots);
  const lowN = at(hull, ATTR.lowSlots);
  const rigN = at(hull, ATTR.rigSlots);
  const turrets = at(hull, ATTR.turretHardpoints);
  const launchers = at(hull, ATTR.launcherHardpoints);
  const droneBay = at(hull, ATTR.droneCapacity);

  const close = need.range === "close";
  const wantNeut = need.role === "ratting" || need.role === "brawl" || need.role === "abyssal";
  const prop = need.role === "kite" || need.role === "tackle" ? PROP.mwd[size] : PROP.ab[size];

  // ── Highs : armes + utilitaires ──
  const highs: WeaponLine[] = [];
  let damageMod = "Drone Damage Amplifier II";
  if (system !== "drone") {
    const def = WEAPONS[system][need.range];
    damageMod = def.damageMod;
    let count = def.hardpoint === "launcher" ? launchers : turrets;
    if (count <= 0) count = Math.min(hiN, Math.max(turrets, launchers) || hiN);
    count = Math.min(count, hiN);
    for (let i = 0; i < count; i++) highs.push({ name: def.weapon[size], charge: def.charge[size] });
  }
  const remainingHi = hiN - highs.length;
  if (wantNeut && remainingHi > 0) {
    for (let i = 0; i < Math.min(remainingHi, 1); i++) highs.push({ name: UTIL.neut[size] });
  }

  // ── Drones ──
  const drones: { name: string; qty: number }[] = [];
  if (droneBay > 0) {
    const d = DRONES[size];
    const qty = Math.max(1, Math.min(5, Math.floor(droneBay / d.volume)));
    drones.push({ name: d.name, qty });
  }

  // ── Mids ──
  const midOrder: string[] = [prop];
  if (tank === "shield") {
    midOrder.push(SHIELD.resist, SHIELD.ext[size]);
    if (need.role === "brawl") midOrder.push(UTIL.scram, UTIL.web);
    else if (need.role === "kite" || need.role === "tackle") midOrder.push(UTIL.point, UTIL.web);
    midOrder.push(SHIELD.ext[size], UTIL.capRecharger);
  } else {
    if (need.role === "brawl") midOrder.push(UTIL.scram, UTIL.web);
    else if (need.role === "kite" || need.role === "tackle") midOrder.push(UTIL.point, UTIL.web);
    if (close && (need.role === "ratting" || need.role === "abyssal" || need.role === "mission"))
      midOrder.push(UTIL.capBooster[size]);
    midOrder.push(UTIL.capRecharger, UTIL.capRecharger);
  }
  const mids = midOrder.slice(0, midN);

  // ── Lows ──
  const lowOrder: string[] = [];
  if (tank === "armor") {
    lowOrder.push(ARMOR.dcu, ARMOR.plate[size], ARMOR.resist);
    while (lowOrder.length < lowN) lowOrder.push(damageMod);
  } else {
    lowOrder.push(ARMOR.dcu);
    while (lowOrder.length < lowN) lowOrder.push(damageMod);
  }
  const lows = lowOrder.slice(0, lowN);

  // ── Rigs ──
  // Baseline tank : rigs de PV (≈75 de calibration chacun → tiennent à 3).
  // Un rig de dégâts coûte ~300 de calibration et fait souvent déborder ; on le
  // laisse en ajout manuel pour garder un fit montable par défaut.
  const tankRig = tank === "armor" ? ARMOR.hpRig[size] : SHIELD.hpRig[size];
  const rigs = Array<string>(Math.max(0, rigN)).fill(tankRig);

  return { size, system, tank, highs, mids, lows, rigs, drones };
}

/** Loadout de **minage** : foreuses + rendement + tank bouclier, aucun DPS. */
function buildMiningLoadout(hull: EsiType): Loadout {
  const size = hullSize(hull);
  const hiN = at(hull, ATTR.hiSlots);
  const midN = at(hull, ATTR.medSlots);
  const lowN = at(hull, ATTR.lowSlots);
  const rigN = at(hull, ATTR.rigSlots);
  const turrets = at(hull, ATTR.turretHardpoints);
  const droneBay = at(hull, ATTR.droneCapacity);

  // Barges/exhumers/capitaux → strip miners ; frégates de minage → Miner II.
  const big = [463, 543, 883, 941].includes(hull.groupId);
  const minerName = big ? MINING_CAT.stripMiner : MINING_CAT.miner;
  const minerCount = Math.min(turrets > 0 ? turrets : hiN, hiN);
  const highs: WeaponLine[] = Array.from({ length: minerCount }, () => ({ name: minerName }));

  const mids: string[] = [];
  if (midN > 0) mids.push(MINING_CAT.survey);
  while (mids.length < midN) mids.push(SHIELD.ext[size]);

  const lows: string[] = Array.from({ length: lowN }, () => MINING_CAT.yieldLow);
  const rigs: string[] = Array.from({ length: rigN }, () => SHIELD.hpRig[size]);

  const drones: { name: string; qty: number }[] = [];
  if (droneBay > 0) {
    const qty = Math.max(1, Math.min(5, Math.floor(droneBay / 5)));
    drones.push({ name: MINING_CAT.miningDrone, qty });
  }
  return { size, system: "mining", tank: "shield", highs, mids, lows, rigs, drones };
}

/** Loadout **industriel** : soute + tampon de PV, aucun armement. */
function buildHaulerLoadout(hull: EsiType): Loadout {
  const size = hullSize(hull);
  const midN = at(hull, ATTR.medSlots);
  const lowN = at(hull, ATTR.lowSlots);
  const rigN = at(hull, ATTR.rigSlots);

  const mids: string[] = Array.from({ length: midN }, () => SHIELD.ext[size]);
  const lows: string[] = [];
  if (lowN > 0) lows.push(INDUS_CAT.bulkhead);
  while (lows.length < lowN) lows.push(INDUS_CAT.cargo);
  const rigs: string[] = Array.from({ length: rigN }, () => SHIELD.hpRig[size]);

  return { size, system: "industrial", tank: "shield", highs: [], mids, lows, rigs, drones: [] };
}

/** Assemble un loadout en texte EFT. */
export function assembleEft(hullName: string, fitName: string, lo: Loadout): string {
  const sections: string[][] = [];
  if (lo.lows.length) sections.push(lo.lows);
  if (lo.mids.length) sections.push(lo.mids);
  if (lo.highs.length) sections.push(lo.highs.map((h) => (h.charge ? `${h.name}, ${h.charge}` : h.name)));
  if (lo.rigs.length) sections.push(lo.rigs);
  if (lo.drones.length) sections.push(lo.drones.map((d) => `${d.name} x${d.qty}`));
  return `[${hullName}, ${fitName}]\n` + sections.map((s) => s.join("\n")).join("\n\n");
}
