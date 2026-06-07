/**
 * Types partagés entre le **moteur pur** (`analyze.ts`) et la couche réseau
 * (`api.ts`). Garder ce fichier sans dépendance permet de tester le moteur au
 * Node (fixtures d'attributs) sans toucher à l'ESI.
 */
import type { DamageType } from "./attrs";

/** Type EVE résolu depuis l'ESI, réduit à ce dont le moteur a besoin. */
export interface EsiType {
  id: number;
  name: string;
  groupId: number;
  /** `attribute_id` → valeur. */
  attrs: Record<number, number>;
  /** `effect_id` des effets du type (sert à déduire le slot). */
  effects: number[];
}

export type Slot = "high" | "mid" | "low" | "rig" | "subsystem" | "drone" | "cargo";

/** Un item résolu et placé dans le fit. */
export interface FitItem {
  type: EsiType;
  charge?: EsiType;
  qty: number;
  slot: Slot;
}

/** Profil de dégâts (fractions sommant à 1) pour le calcul d'EHP effectif. */
export type DamageProfile = Record<DamageType, number>;

/** Résist & PV d'une couche de tank. */
export interface LayerTank {
  hp: number;
  /** résist% par type de dégât (0..1). */
  resist: Record<DamageType, number>;
  /** EHP de la couche selon le profil de dégâts courant. */
  ehp: number;
}

export interface TankResult {
  shield: LayerTank;
  armor: LayerTank;
  hull: LayerTank;
  /** EHP total (somme des couches) selon le profil. */
  ehp: number;
  /** PV bruts cumulés (sans résist). */
  rawHp: number;
}

export interface CapResult {
  capacity: number;
  rechargeTime: number; // s
  peakRecharge: number; // GJ/s livrés au pic (~25 %)
  usage: number; // GJ/s consommés par les modules actifs
  stable: boolean;
  /** % de stabilité si stable, sinon null. */
  stablePct: number | null;
  /** secondes avant vidage si instable, sinon null. */
  depletesIn: number | null;
}

export interface NavResult {
  maxVelocity: number;
  mass: number;
  inertia: number;
  alignTime: number; // s
  warpSpeed: number; // AU/s
  signatureRadius: number;
}

export interface FittingResult {
  cpu: { used: number; total: number };
  pg: { used: number; total: number };
  calibration: { used: number; total: number };
  slots: {
    high: { used: number; total: number };
    mid: { used: number; total: number };
    low: { used: number; total: number };
    rig: { used: number; total: number };
  };
  turrets: { used: number; total: number };
  launchers: { used: number; total: number };
  drones: { usedBandwidth: number; bandwidth: number; usedBay: number; bay: number };
  overflow: boolean;
}

export interface DpsResult {
  total: number;
  volley: number;
  turret: number;
  missile: number;
  drone: number;
  /** Répartition des DPS par type de dégât. */
  byType: Record<DamageType, number>;
}

export type CheckLevel = "danger" | "warn" | "ok" | "info";
/** Variables interpolées dans les messages localisés (clés `atelier.*`). */
export type MsgVars = Record<string, string | number>;
/**
 * Contrôle de cohérence d'un fit. Porte un `code` **stable** (et d'éventuelles
 * `vars`) plutôt qu'une phrase : la traduction se fait côté composant via
 * `t("atelier.check." + code, vars)`.
 */
export interface FitCheck {
  level: CheckLevel;
  code: string;
  vars?: MsgVars;
}

/**
 * Hypothèse de calcul affichée honnêtement. Porte une `key` stable (+ `vars`),
 * traduite côté composant via `t("atelier.assumption." + key, vars)`.
 */
export interface Assumption {
  key: string;
  vars?: MsgVars;
  /** Notes de bonus de vaisseau structurées (formatées/jointes côté composant). */
  notes?: HullBonusNote[];
}

/** Note de bonus de vaisseau, structurée (formatée et traduite côté composant). */
export interface HullBonusNote {
  /** `dps` (% dégâts), `resist` (% résist) ou `hp` (% PV). */
  type: "dps" | "resist" | "hp";
  /** Pourcentage entier (déjà arrondi). */
  pct: number;
  /** Système d'arme concerné (pour `type === "dps"`). */
  weapon?: import("../data/catalog").WeaponSystem;
  /** Couche de tank concernée (pour `type === "resist" | "hp"`). */
  layer?: "armor" | "shield";
}

export interface FitAnalysis {
  shipName: string;
  fitName: string;
  shipTypeId: number;
  tank: TankResult;
  cap: CapResult;
  nav: NavResult;
  fitting: FittingResult;
  dps: DpsResult;
  checks: FitCheck[];
  /** Hypothèses appliquées (compétences, etc.) à afficher honnêtement. */
  assumptions: Assumption[];
  items: FitItem[];
}

/** Bonus de vaisseau résolus en multiplicateurs (cf. `lib/bonuses.ts`). */
export interface HullBonus {
  weapon?: import("../data/catalog").WeaponSystem;
  /** Multiplicateur de DPS sur le système d'arme bonusé. */
  dpsMult: number;
  /** Couche de tank avec bonus de résist. */
  layer?: "armor" | "shield";
  /** Multiplicateur de résonance (<1 = plus de résist) sur `layer`. */
  resoMult: number;
  /** Couche de tank avec bonus de PV. */
  hpLayer?: "armor" | "shield";
  /** Multiplicateur de PV sur `hpLayer`. */
  hpMult: number;
  /** Notes structurées (formatées et traduites côté composant). */
  notes: HullBonusNote[];
}

/** Options de calcul (compétences supposées, profil de dégâts, bonus de vaisseau). */
export interface AnalyzeOptions {
  /** Applique les bonus de PV universels niveau V (Bouclier/Armure/Méca +25 %). */
  allFiveHp: boolean;
  /** Profil de dégâts pour l'EHP effectif. */
  profile: DamageProfile;
  /** Bonus de vaisseau (appliqués si présents) — DPS/EHP affinés par les traits. */
  hullBonus?: HullBonus | null;
}

export const OMNI_PROFILE: DamageProfile = { em: 0.25, th: 0.25, kin: 0.25, exp: 0.25 };
