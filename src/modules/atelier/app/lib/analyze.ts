/**
 * Moteur d'analyse de fit — **pur** (prend des `EsiType` déjà résolus, aucune
 * dépendance réseau). Calcule tank/EHP, condensateur, navigation, encombrement,
 * DPS et contrôles de cohérence.
 *
 * Honnêteté : les valeurs sont calculées à partir des attributs dogma des
 * **modules et de la vaisseau**. Les bonus de **compétences** et les **bonus de
 * rôle de vaisseau** (traits) ne sont pas appliqués (sauf option PV niveau V
 * universelle). Les nombres sont donc exacts pour les modules eux-mêmes et de
 * très bons indicateurs comparatifs ; ils peuvent différer de quelques % du jeu
 * pour les vaisseaux à bonus. Cela est indiqué dans `assumptions`.
 */
import { ATTR, DAMAGE_ATTR, DAMAGE_TYPES, EFFECT_SLOT, RESONANCE, type DamageType } from "./attrs";
import { combineResonance } from "./stacking";
import {
  type AnalyzeOptions,
  type Assumption,
  type CapResult,
  type DpsResult,
  type EsiType,
  type FitAnalysis,
  type FitCheck,
  type FitItem,
  type FittingResult,
  type LayerTank,
  type NavResult,
  type Slot,
  type TankResult,
} from "./types";

const a = (t: EsiType, id: number, fallback = 0): number => t.attrs[id] ?? fallback;
const has = (t: EsiType, id: number): boolean => t.attrs[id] != null && t.attrs[id] !== 0;

/** Déduit le slot d'un module depuis ses effets dogma. */
export function slotOf(t: EsiType): Slot | null {
  for (const e of t.effects) {
    const s = EFFECT_SLOT[e];
    if (s) return s;
  }
  return null;
}

/** Un type est-il un drone ? (dégâts + vitesse propre, sans slot module). */
function isDrone(t: EsiType): boolean {
  const dmg = DAMAGE_TYPES.some((d) => has(t, DAMAGE_ATTR[d]));
  return dmg && has(t, ATTR.maxVelocity) && slotOf(t) == null;
}

/** Construit les items placés à partir des lignes EFT résolues. */
export function placeItems(
  resolved: Map<string, EsiType>,
  lines: { name: string; qty: number; charge?: string }[],
): FitItem[] {
  const items: FitItem[] = [];
  for (const l of lines) {
    const type = resolved.get(l.name.toLowerCase());
    if (!type) continue;
    const charge = l.charge ? resolved.get(l.charge.toLowerCase()) : undefined;
    let slot = slotOf(type) as Slot | null;
    if (!slot) slot = isDrone(type) ? "drone" : "cargo";
    items.push({ type, charge, qty: l.qty, slot });
  }
  return items;
}

// ─────────────────────────────── Tank / EHP ───────────────────────────────

function layer(
  baseHp: number,
  hpBonus: number,
  layerKey: "shield" | "armor" | "hull",
  ship: EsiType,
  resonanceModules: EsiType[],
  profile: Record<DamageType, number>,
  hullHpMult = 1,
  hullResoMult = 1,
): LayerTank {
  const hp = (baseHp + hpBonus) * hullHpMult;
  const resist = {} as Record<DamageType, number>;
  let weightedResonance = 0;
  for (const d of DAMAGE_TYPES) {
    const resAttr = RESONANCE[layerKey][d];
    const baseRes = ship.attrs[resAttr] ?? 1; // 1 = 0 % résist par défaut
    // Multiplicateurs des modules portant cette résonance (< 1 = amélioration).
    const mults = resonanceModules
      .map((m) => m.attrs[resAttr])
      .filter((v): v is number => v != null && v !== 1);
    // Bonus de vaisseau (rôle/niveau) appliqué après l'empilement des modules,
    // sans pénalité d'empilement (les bonus de vaisseau ne s'empilent pas).
    const finalResonance = Math.max(0, baseRes * combineResonance(mults) * hullResoMult);
    resist[d] = 1 - finalResonance;
    weightedResonance += profile[d] * finalResonance;
  }
  const ehp = weightedResonance > 0 ? hp / weightedResonance : hp;
  return { hp, resist, ehp };
}

function computeTank(ship: EsiType, items: FitItem[], opts: AnalyzeOptions): TankResult {
  // Modules susceptibles de modifier la résonance (slots actifs + rigs + subsys).
  const resoMods = items
    .filter((i) => i.slot === "high" || i.slot === "mid" || i.slot === "low" || i.slot === "rig" || i.slot === "subsystem")
    .flatMap((i) => Array<EsiType>(i.qty).fill(i.type));

  const shieldBonus = sumBonus(items, ATTR.shieldHpBonus);
  const armorBonus = sumBonus(items, ATTR.armorHpBonus);

  const k = opts.allFiveHp ? 1.25 : 1; // PV niveau V universel (optionnel)
  const hb = opts.hullBonus ?? null;
  const hpMul = (l: "armor" | "shield") => (hb && hb.hpLayer === l ? hb.hpMult : 1);
  const resoMul = (l: "armor" | "shield") => (hb && hb.layer === l ? hb.resoMult : 1);
  const shield = layer(a(ship, ATTR.shieldCapacity) * k, shieldBonus, "shield", ship, resoMods, opts.profile, hpMul("shield"), resoMul("shield"));
  const armor = layer(a(ship, ATTR.armorHP) * k, armorBonus, "armor", ship, resoMods, opts.profile, hpMul("armor"), resoMul("armor"));
  const hull = layer(a(ship, ATTR.structureHP) * k, 0, "hull", ship, resoMods, opts.profile);

  return {
    shield,
    armor,
    hull,
    ehp: shield.ehp + armor.ehp + hull.ehp,
    rawHp: shield.hp + armor.hp + hull.hp,
  };
}

/** Somme d'un attribut de bonus de PV plat sur tous les items (× qty). */
function sumBonus(items: FitItem[], attrId: number): number {
  let sum = 0;
  for (const i of items) {
    const v = i.type.attrs[attrId];
    if (v != null) sum += v * i.qty;
  }
  return sum;
}

// ─────────────────────────────── Condensateur ───────────────────────────────

function computeCap(ship: EsiType, items: FitItem[]): CapResult {
  const capacity = a(ship, ATTR.capCapacity) + sumBonus(items, ATTR.capBonus);
  const rechargeTime = a(ship, ATTR.capRechargeTime) / 1000; // s
  const peakRecharge = rechargeTime > 0 ? (2.5 * capacity) / rechargeTime : 0;

  // Consommation des modules actifs (coût d'activation / durée).
  let usage = 0;
  const drains: { need: number; duration: number }[] = [];
  for (const i of items) {
    if (i.slot !== "high" && i.slot !== "mid" && i.slot !== "low") continue;
    const need = i.type.attrs[ATTR.capacitorNeed];
    const dur = i.type.attrs[ATTR.duration];
    if (need == null || need <= 0 || dur == null || dur <= 0) continue;
    for (let n = 0; n < i.qty; n++) {
      usage += need / (dur / 1000);
      drains.push({ need, duration: dur / 1000 });
    }
  }

  // Stabilité : usage = (10·Cmax/τ)·(√x − x). Résolution en u = √x.
  let stable = false;
  let stablePct: number | null = null;
  let depletesIn: number | null = null;
  if (capacity > 0 && rechargeTime > 0) {
    const k = (usage * rechargeTime) / (10 * capacity);
    const disc = 1 - 4 * k;
    if (usage <= 0) {
      stable = true;
      stablePct = 100;
    } else if (disc >= 0) {
      stable = true;
      const u = (1 + Math.sqrt(disc)) / 2; // racine stable (cap haut)
      stablePct = u * u * 100;
    } else {
      stable = false;
      depletesIn = simulateDepletion(capacity, rechargeTime, drains);
    }
  }

  return { capacity, rechargeTime, peakRecharge, usage, stable, stablePct, depletesIn };
}

/** Simule la décharge du condensateur (cf. dogma-engine) → secondes avant vidage. */
function simulateDepletion(
  capacity: number,
  rechargeTime: number,
  mods: { need: number; duration: number }[],
): number {
  if (!mods.length) return Infinity;
  const state = mods.map((m) => ({ ...m, timeNext: 0 }));
  let cap = capacity;
  let timeLast = 0;
  let timeNext = 0;
  let guard = 0;
  while (cap > 0 && guard++ < 1_000_000) {
    cap =
      (1 + (Math.sqrt(cap / capacity) - 1) * Math.exp((5 * (timeLast - timeNext)) / rechargeTime)) ** 2 *
      capacity;
    timeLast = timeNext;
    timeNext = Infinity;
    for (const m of state) {
      if (m.timeNext <= timeLast) {
        m.timeNext += m.duration;
        cap -= m.need;
      }
      timeNext = Math.min(timeNext, m.timeNext);
    }
  }
  return timeLast;
}

// ─────────────────────────────── Navigation ───────────────────────────────

function computeNav(ship: EsiType, items: FitItem[]): NavResult {
  const mass = a(ship, ATTR.mass) + sumBonus(items, ATTR.massAddition);
  const inertia = a(ship, ATTR.inertia);
  // align = −ln(0.25)·masse·inertie / 1e6
  const alignTime = mass > 0 && inertia > 0 ? (Math.LN2 * 2 * mass * inertia) / 1_000_000 : 0;
  return {
    maxVelocity: a(ship, ATTR.maxVelocity),
    mass,
    inertia,
    alignTime,
    warpSpeed: a(ship, ATTR.warpSpeedMul, 1) * 3, // base 3 UA/s
    signatureRadius: a(ship, ATTR.signatureRadius),
  };
}

// ─────────────────────────────── Encombrement ───────────────────────────────

function computeFitting(ship: EsiType, items: FitItem[], opts: AnalyzeOptions): FittingResult {
  const used = (slot: Slot) => items.filter((i) => i.slot === slot).reduce((n, i) => n + i.qty, 0);

  // Compétences de fitting niveau V (sinon tout fit T2 paraît surchargé) :
  //   CPU Management +25 % CPU vaisseau · Power Grid Management +25 % grille vaisseau
  //   Weapon Upgrades −25 % CPU des armes · Advanced Weapon Upgrades −25 % grille des armes
  const skills = opts.allFiveHp;
  const shipCpuMul = skills ? 1.25 : 1;
  const shipPgMul = skills ? 1.25 : 1;
  const wpnCpuMul = skills ? 0.75 : 1;
  const wpnPgMul = skills ? 0.75 : 1;
  const isWeapon = (i: FitItem) =>
    i.slot === "high" &&
    (has(i.type, ATTR.damageMultiplier) ||
      (i.charge != null && DAMAGE_TYPES.some((d) => has(i.charge!, DAMAGE_ATTR[d]))));

  let cpuUsed = 0;
  let pgUsed = 0;
  // Bonus de sortie CPU/grille des modules d'encombrement (Co-Processor, RCU,
  // PDS, rigs ACR/POU) — combinés avec pénalité d'empilement.
  const cpuOutBonuses: number[] = [];
  const pgOutBonuses: number[] = [];
  for (const i of items) {
    if (i.slot === "drone" || i.slot === "cargo") continue;
    const w = isWeapon(i);
    cpuUsed += (i.type.attrs[ATTR.cpuUsage] ?? 0) * (w ? wpnCpuMul : 1) * i.qty;
    pgUsed += (i.type.attrs[ATTR.pgUsage] ?? 0) * (w ? wpnPgMul : 1) * i.qty;
    for (let n = 0; n < i.qty; n++) {
      const cm = i.type.attrs[ATTR.cpuOutputMul];
      const cp = i.type.attrs[ATTR.cpuOutputPct];
      const pm = i.type.attrs[ATTR.pgOutputMul];
      const pp = i.type.attrs[ATTR.pgOutputPct];
      if (cm) cpuOutBonuses.push(cm);
      if (cp) cpuOutBonuses.push(1 + cp / 100);
      if (pm) pgOutBonuses.push(pm);
      if (pp) pgOutBonuses.push(1 + pp / 100);
    }
  }
  const calUsed = items
    .filter((i) => i.slot === "rig")
    .reduce((n, i) => n + (i.type.attrs[ATTR.calibrationCost] ?? 0) * i.qty, 0);

  const cpu = { used: cpuUsed, total: a(ship, ATTR.cpuOutput) * shipCpuMul * combineResonance(cpuOutBonuses) };
  const pg = { used: pgUsed, total: a(ship, ATTR.pgOutput) * shipPgMul * combineResonance(pgOutBonuses) };
  const calibration = { used: calUsed, total: a(ship, ATTR.calibration) };
  const slots = {
    high: { used: used("high"), total: a(ship, ATTR.hiSlots) },
    mid: { used: used("mid"), total: a(ship, ATTR.medSlots) },
    low: { used: used("low"), total: a(ship, ATTR.lowSlots) },
    rig: { used: used("rig"), total: a(ship, ATTR.rigSlots) },
  };

  // Hardpoints : on compte les armes (turrets = damageMultiplier sans charge
  // missile ; lanceurs ≈ modules avec charge de dégâts).
  let turretsUsed = 0;
  let launchersUsed = 0;
  for (const i of items) {
    if (i.slot !== "high") continue;
    const isLauncher = i.charge != null && DAMAGE_TYPES.some((d) => has(i.charge!, DAMAGE_ATTR[d])) && !has(i.type, ATTR.damageMultiplier);
    if (isLauncher) launchersUsed += i.qty;
    else if (has(i.type, ATTR.damageMultiplier)) turretsUsed += i.qty;
  }

  const droneBay = a(ship, ATTR.droneCapacity);
  const usedBay = items.filter((i) => i.slot === "drone").reduce((n, i) => n + (i.type.attrs[5] ?? 0) * i.qty, 0); // 5 = volume
  const bandwidth = a(ship, ATTR.droneBandwidth);
  const usedBandwidth = items
    .filter((i) => i.slot === "drone")
    .reduce((n, i) => n + (i.type.attrs[ATTR.droneBandwidth] ?? 0) * i.qty, 0);

  const overflow =
    cpu.used > cpu.total + 0.01 ||
    pg.used > pg.total + 0.01 ||
    calibration.used > calibration.total + 0.01 ||
    slots.high.used > slots.high.total ||
    slots.mid.used > slots.mid.total ||
    slots.low.used > slots.low.total ||
    slots.rig.used > slots.rig.total;

  return {
    cpu,
    pg,
    calibration,
    slots,
    turrets: { used: turretsUsed, total: a(ship, ATTR.turretHardpoints) },
    launchers: { used: launchersUsed, total: a(ship, ATTR.launcherHardpoints) },
    drones: { usedBandwidth, bandwidth, usedBay, bay: droneBay },
    overflow,
  };
}

// ─────────────────────────────── DPS ───────────────────────────────

function computeDps(items: FitItem[]): DpsResult {
  const byType = { em: 0, th: 0, kin: 0, exp: 0 } as Record<DamageType, number>;
  let volley = 0;
  let turret = 0;
  let missile = 0;
  let drone = 0;

  for (const i of items) {
    if (i.slot === "high") {
      const mult = i.type.attrs[ATTR.damageMultiplier] ?? 1;
      const rofMs = i.type.attrs[ATTR.rateOfFire];
      const src = i.charge ?? i.type; // charge (munition) ou module (smartbomb…)
      const shot = DAMAGE_TYPES.reduce((s, d) => s + (src.attrs[DAMAGE_ATTR[d]] ?? 0), 0) * mult;
      if (shot <= 0 || !rofMs || rofMs <= 0) continue;
      const dps = (shot / (rofMs / 1000)) * i.qty;
      volley += shot * i.qty;
      for (const d of DAMAGE_TYPES) byType[d] += ((src.attrs[DAMAGE_ATTR[d]] ?? 0) * mult / (rofMs / 1000)) * i.qty;
      // Lanceur = charge porteuse de dégâts, module sans multiplicateur propre.
      if (i.charge && !i.type.attrs[ATTR.damageMultiplier]) missile += dps;
      else turret += dps;
    } else if (i.slot === "drone") {
      const rofMs = i.type.attrs[ATTR.rateOfFire];
      const shot = DAMAGE_TYPES.reduce((s, d) => s + (i.type.attrs[DAMAGE_ATTR[d]] ?? 0), 0);
      if (shot <= 0 || !rofMs || rofMs <= 0) continue;
      const dps = (shot / (rofMs / 1000)) * i.qty;
      drone += dps;
      volley += shot * i.qty;
      for (const d of DAMAGE_TYPES) byType[d] += ((i.type.attrs[DAMAGE_ATTR[d]] ?? 0) / (rofMs / 1000)) * i.qty;
    }
  }

  return { total: turret + missile + drone, volley, turret, missile, drone, byType };
}

/**
 * Applique le bonus de DPS de la vaisseau au **canal** correspondant (drones, ou
 * tourelles+missiles), uniquement si le fit emploie effectivement ce type d'arme.
 */
function applyHullDps(dps: DpsResult, hb: import("./types").HullBonus | null, items: FitItem[]): void {
  if (!hb || !hb.weapon || hb.dpsMult <= 1.0001) return;
  const hasDrones = items.some((i) => i.slot === "drone");
  const hasWeapons = items.some((i) => i.slot === "high" && (i.type.attrs[ATTR.rateOfFire] ?? 0) > 0);
  const droneMul = hb.weapon === "drone" && hasDrones ? hb.dpsMult : 1;
  const weaponMul = hb.weapon !== "drone" && hasWeapons ? hb.dpsMult : 1;
  if (droneMul === 1 && weaponMul === 1) return;
  const old = dps.total;
  dps.drone *= droneMul;
  dps.turret *= weaponMul;
  dps.missile *= weaponMul;
  dps.total = dps.turret + dps.missile + dps.drone;
  const ratio = old > 0 ? dps.total / old : 1;
  dps.volley *= ratio;
  for (const d of DAMAGE_TYPES) dps.byType[d] *= ratio;
}

// ─────────────────────────────── Contrôles ───────────────────────────────

function runChecks(tank: TankResult, cap: CapResult, fit: FittingResult, items: FitItem[]): FitCheck[] {
  const checks: FitCheck[] = [];
  const push = (level: FitCheck["level"], code: string, vars?: FitCheck["vars"]) =>
    checks.push({ level, code, vars });

  if (fit.overflow) push("danger", "overflow");
  if (fit.cpu.used > fit.cpu.total + 0.01)
    push("danger", "cpuOver", { used: round(fit.cpu.used), total: round(fit.cpu.total) });
  if (fit.pg.used > fit.pg.total + 0.01)
    push("danger", "pgOver", { used: round(fit.pg.used), total: round(fit.pg.total) });
  if (fit.calibration.used > fit.calibration.total + 0.01)
    push("danger", "calOver", { used: round(fit.calibration.used), total: round(fit.calibration.total) });

  // Tank cohérent : armure vs bouclier (où sont les PV gagnés par modules ?).
  const shieldExtra = tank.shield.hp - 0; // bonus inclus
  const armorBase = tank.armor.hp;
  const shieldMods = items.some((i) => i.type.attrs[ATTR.shieldHpBonus] != null);
  const armorMods = items.some((i) => i.type.attrs[ATTR.armorHpBonus] != null);
  if (shieldMods && armorMods) push("warn", "hybridTank");

  if (!cap.stable && cap.depletesIn != null && cap.depletesIn < 120) {
    push("warn", "capUnstable", { sec: Math.round(cap.depletesIn) });
  } else if (cap.stable && cap.stablePct != null) {
    push("ok", "capStable", { pct: Math.round(cap.stablePct) });
  }

  // Pas de tank du tout ?
  if (tank.shield.hp <= tank.hull.hp && tank.armor.hp <= 0) push("info", "noTank");

  void shieldExtra;
  void armorBase;
  return checks;
}

const round = (n: number) => Math.round(n);

// ─────────────────────────────── Orchestration ───────────────────────────────

export function analyzeFit(
  ship: EsiType,
  fitName: string,
  items: FitItem[],
  opts: AnalyzeOptions,
): FitAnalysis {
  const tank = computeTank(ship, items, opts);
  const cap = computeCap(ship, items);
  const nav = computeNav(ship, items);
  const fitting = computeFitting(ship, items, opts);
  const dps = computeDps(items);
  applyHullDps(dps, opts.hullBonus ?? null, items);
  const checks = runChecks(tank, cap, fitting, items);

  const hb = opts.hullBonus ?? null;
  const assumptions: Assumption[] = [
    { key: opts.allFiveHp ? "skillsV" : "skills0" },
    hb && hb.notes.length
      ? { key: "hullBonus", notes: hb.notes }
      : { key: "noHullBonus" },
    { key: "dps" },
  ];

  return {
    shipName: ship.name,
    fitName,
    shipTypeId: ship.id,
    tank,
    cap,
    nav,
    fitting,
    dps,
    checks,
    assumptions,
    items,
  };
}
