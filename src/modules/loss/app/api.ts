/**
 * Pont typé vers les commandes IPC Rust du Loss Analyzer (`loss_*`), exposées
 * par le shell Tauri. Réutilise le moteur `pbh-core` (ESI + zKillboard,
 * User-Agent conforme) déjà câblé pour le module Pirate.
 *
 * Hors application desktop, `invoke` lève une erreur claire (le moteur
 * zKill/ESI vit côté Rust pour la conformité — User-Agent, quota d'erreurs).
 */
import { invoke } from "@/core/runtime";
import { track } from "@/core/analytics";

/** Emplacement d'un module sur la vaisseau (issu du `flag` d'inventaire EVE). */
export type Slot = "high" | "mid" | "low" | "rig" | "subsystem" | "drone" | "other";

/** Classe de gang du côté qui t'a tué. */
export type GangClass = "solo" | "small_gang" | "fleet" | "blob" | "npc";

export interface FitModule {
  type_id: number;
  name: string | null;
  quantity: number;
  slot: Slot;
}

export interface PmAttacker {
  character_id: number | null;
  character_name: string | null;
  corporation_id: number | null;
  corporation_name: string | null;
  alliance_id: number | null;
  alliance_name: string | null;
  ship_type_id: number | null;
  ship_name: string | null;
  weapon_type_id: number | null;
  weapon_name: string | null;
  damage_done: number;
  final_blow: boolean;
  /** Part des dégâts totaux subis, 0..1. */
  damage_share: number;
}

export interface PmCount {
  id: number;
  name: string | null;
  count: number;
}

export interface PmFit {
  high: FitModule[];
  mid: FitModule[];
  low: FitModule[];
  rig: FitModule[];
  drone: FitModule[];
}

export interface PostMortem {
  killmail_id: number;
  killmail_time: string;
  solar_system_id: number | null;
  system_name: string | null;

  victim_character_id: number | null;
  victim_character_name: string | null;
  victim_corporation_id: number | null;
  victim_corporation_name: string | null;
  victim_alliance_id: number | null;
  victim_alliance_name: string | null;
  ship_type_id: number | null;
  ship_name: string | null;
  damage_taken: number;

  total_value: number;
  destroyed_value: number;
  dropped_value: number;
  fitted_value: number;
  /** Fraction de la valeur totale qui a droppé (loot survivant), 0..1. */
  dropped_ratio: number;

  attacker_count: number;
  npc: boolean;
  solo: boolean;
  gang_class: GangClass;
  final_blow: PmAttacker | null;
  top_damage: PmAttacker[];
  ship_breakdown: PmCount[];
  alliances: PmCount[];

  fit: PmFit;
}

/** Post-mortem d'un killmail par id (+ hash optionnel d'un lien ESI). */
export function analyzeKillmail(
  killmailId: number,
  hash?: string,
): Promise<PostMortem> {
  track("loss_analyzed", { source: "killmail" });
  return invoke<PostMortem>("loss_analyze_killmail", {
    killmailId,
    hash: hash ?? null,
  });
}

/** Post-mortem de la dernière perte d'un personnage (null s'il n'en a aucune). */
export function analyzeLatest(characterId: number): Promise<PostMortem | null> {
  track("loss_analyzed", { source: "latest" });
  return invoke<PostMortem | null>("loss_analyze_latest", { characterId });
}

/** Résout un nom de personnage en id (null si ESI ne le connaît pas). */
export function resolveCharacter(name: string): Promise<number | null> {
  return invoke<number | null>("loss_resolve_character", { name });
}
