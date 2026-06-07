import type { BeltType } from "@mining/data/ores";

export type SessionStatus = "active" | "ended";

/** Un membre de la corpo (roster persistant). */
export interface Member {
  id: string;
  name: string;
  createdAt: number;
}

/** Un joueur réel regroupant plusieurs personnages (alts). */
export interface PlayerGroup {
  id: string;
  name: string;
  memberIds: string[];
}

/** Une plage de présence d'un membre dans une session. leftAt null = encore présent. */
export interface PresenceInterval {
  joinedAt: number;
  leftAt: number | null;
}

/** L'état d'un membre au sein d'une session (présence cumulée). */
export interface SessionMember {
  memberId: string;
  name: string; // figé au moment de l'ajout (résistant au renommage/suppression)
  intervals: PresenceInterval[];
  /** Vaisseau d'extraction utilisé pendant la session (optionnel). */
  barge?: string;
  /** Pilote scout / explorateur (payé un % du butin au lieu de miner). */
  scout?: boolean;
  /** Fleet Commander de la session (un seul). */
  fc?: boolean;
}

/** Compteur de belts (gisements) minés pour un minerai donné. */
export interface OreCount {
  oreId: string;
  belts: number;
}

/** Mode de répartition de l'ISK. */
export type PayoutMode = "presence" | "mined";

/**
 * Base de répartition de l'ISK entre membres (les bonus FC/scout sont conservés
 * et prélevés sur le total dans tous les cas) :
 * - `mined`    : au prorata du minerai réellement miné (défaut si récoltes) ;
 * - `equal`    : division égale par membre ;
 * - `presence` : au prorata du temps de présence actif.
 */
export type PayoutBasis = "mined" | "equal" | "presence";

/**
 * Un événement de récolte issu du copier-coller des Diffusions de flotte.
 * Ex : « 09:48:40 Marie Alneb has looted 50,174 x Omber III-Grade ».
 */
export interface LootEvent {
  /** Signature unique (time|miner|qty|oreRaw) pour dédupliquer les re-collages. */
  sig: string;
  time: string; // HH:MM:SS tel que diffusé (sans date)
  miner: string; // nom du pilote tel que diffusé
  qty: number; // quantité en unités
  ore: string; // nom canonique EVE (base + grade), ex : "Omber III-Grade"
  base: string; // minerai de base (ex : "Omber")
  grade: number; // 0 = base, 1..4 = I/II/III/IV-Grade
  raw: string; // libellé minerai complet d'origine
}

/**
 * Événement de flotte (entrée/sortie) issu des Diffusions.
 * Ex : « 23:00:50 - Ranneve3 left fleet » · « 20:20:21 - Ranneve3 joined as Squad Member ».
 * Sert à mettre en pause / relancer le chrono d'un membre EXISTANT (jamais à en créer).
 */
export interface FleetEvent {
  sig: string; // signature unique (time|membre|type) pour dédupliquer les re-collages
  time: string; // HH:MM:SS (temps EVE = UTC)
  member: string; // nom du pilote tel que diffusé
  type: "join" | "leave";
}

/**
 * Ligne de stock de consommables, issue du copier-coller de l'inventaire EVE.
 * Ex : « Mining Laser Efficiency Charge    9700 » (nom <tab> quantité).
 */
export interface StockItem {
  name: string; // nom exact de l'objet (ex : "Heavy Water")
  qty: number; // quantité en stock
}

/** Cumul des mouvements d'un consommable sur la session (boutons Ajouter/Déduire). */
export interface StockMove {
  name: string;
  added: number; // total ajouté (+)
  removed: number; // total déduit (−)
}

/** Forme retenue pour la valorisation du minerai. */
export type ValuationForm = "raw" | "compressed";

export interface Session {
  id: string;
  name: string;
  /** Types de gisement de la session (plusieurs possibles, à titre indicatif). */
  types: BeltType[];
  status: SessionStatus;
  startedAt: number;
  endedAt: number | null;
  members: SessionMember[];
  /** Compteur de belts par type de gisement (standard/anomaly/ice). */
  beltCounts: Record<string, number>;
  /** Ancien compteur par minerai (hérité, plus utilisé pour la saisie). */
  ores: OreCount[];
  /** Valeur ISK totale du butin (saisie manuelle, mode présence). */
  totalIsk: number;
  notes: string;
  /** Récoltes importées depuis les Diffusions de flotte. */
  lootEvents: LootEvent[];
  /** Entrées/sorties de flotte (pause/reprise du chrono) depuis les Diffusions. */
  fleetEvents?: FleetEvent[];
  /** Prix ISK / unité par minerai canonique (grades séparés). */
  orePrices: Record<string, number>;
  /** Base de répartition de l'ISK. */
  payoutMode: PayoutMode;
  /** Valorisation au minerai brut ou compressé. */
  valuationForm: ValuationForm;
  /** Pourcentage reversé aux mineurs (rachat corpo, défaut 100). */
  buybackPct: number;
  /** Pourcentage du butin versé à chaque scout/explorateur. */
  scoutPct: number;
  /** Pourcentage du butin versé au Fleet Commander. */
  fcPct: number;
  /** Override manuel de la valeur du butin miné (0 = valeur Jita auto). */
  iskOverride: number;
  /** Clés des joueurs déjà payés (suivi des paiements). */
  paidPlayers: string[];
  /** Compteurs d'événements de session (clé d'événement → nombre). */
  events: Record<string, number>;
  /** Stock de consommables de la session (inventaire collé). */
  stock: StockItem[];
  /** Prix ISK / unité par consommable du stock. */
  stockPrices: Record<string, number>;
  /** Journal des mouvements de stock (+ ajouté / − déduit) par objet (clé minuscule). */
  stockLog?: Record<string, StockMove>;
  /** Rendement de retraitement appliqué aux minéraux produits (%, défaut 100). */
  refinePct: number;
  /** Base de répartition choisie (sinon auto : minerai si récoltes, sinon présence). */
  payoutBasis?: PayoutBasis;
}

export interface AppState {
  members: Member[];
  playerGroups: PlayerGroup[];
  sessions: Session[];
  activeSessionId: string | null;
}
