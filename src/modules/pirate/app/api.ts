/**
 * Pont typé vers les commandes IPC Rust du module Pirate, exposées par le shell
 * Tauri de la suite (`pirate_*`). Passe par le pont `invoke` de la suite, qui
 * lève une erreur claire hors application desktop (ESI/zKillboard côté Rust).
 *
 * Types et logique repris **à l'identique** de l'app standalone (parité).
 */
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke, isTauri } from "@/core/runtime";
import { track } from "@/core/analytics";

/** Ouvre une URL externe : navigateur système en desktop, onglet en web. */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await openUrl(url);
      return;
    } catch {
      /* repli ci-dessous */
    }
  }
  if (typeof window !== "undefined")
    window.open(url, "_blank", "noopener,noreferrer");
}

export type ThreatLevel =
  | "harmless"
  | "moderate"
  | "dangerous"
  | "deadly"
  | "unknown";

export type WatchTag = "friend" | "foe" | "cyno" | "spy";

export interface ShipUsage {
  ship_type_id: number;
  ship_name: string | null;
  count: number;
}

export interface KillStats {
  ships_destroyed: number;
  ships_lost: number;
  solo_kills: number;
  danger_ratio: number;
  gang_ratio: number;
  isk_destroyed: number;
  top_ships: ShipUsage[];
  last_kill_at: number | null;
}

export interface PilotIntel {
  name: string;
  character_id: number | null;
  corporation_id: number | null;
  corporation_name: string | null;
  alliance_id: number | null;
  alliance_name: string | null;
  security_status: number | null;
  stats: KillStats | null;
  threat: ThreatLevel;
  threat_score: number | null;
  top_ship_class: string | null;
  watch_tag: WatchTag | null;
  from_cache: boolean;
  error: string | null;
}

export interface WatchlistEntry {
  character_id: number;
  tag: WatchTag;
  note: string;
  name: string | null;
}

export type Slot = "high" | "mid" | "low" | "rig" | "subsystem" | "drone" | "other";

export type FitSource = "own_loss" | "corp_doctrine" | "alliance_doctrine";

export interface FitModule {
  type_id: number;
  name: string | null;
  quantity: number;
  slot: Slot;
}

export interface PredictedShip {
  ship_type_id: number;
  ship_name: string | null;
  high: FitModule[];
  mid: FitModule[];
  low: FitModule[];
  rig: FitModule[];
  other: FitModule[];
  confidence: number;
  confidence_label: string;
  source: FitSource;
  sample_size: number;
  killmail_id: number;
  killmail_time: string;
  total_value: number;
}

export interface CynoAssessment {
  suspect: boolean;
  score: number;
  reasons: string[];
}

export interface ActivityProfile {
  hours: number[]; // length 24, loss count per UTC hour
  samples: number;
  peak_hours: number[];
  tz_guess: string | null;
}

export interface FitPrediction {
  character_id: number;
  ships: PredictedShip[];
  losses_examined: number;
  cyno: CynoAssessment;
  activity: ActivityProfile;
  note: string | null;
}

export interface CoFlyer {
  character_id: number;
  name: string | null;
  kills_together: number;
}

export interface NetworkAnalysis {
  character_id: number;
  kills_examined: number;
  coflyers: CoFlyer[];
}

/** Analyse avec qui un pilote vole le plus souvent (réseau de gang). */
export function analyzeNetwork(characterId: number): Promise<NetworkAnalysis> {
  track("pirate_analyzed", { mode: "network" });
  return invoke<NetworkAnalysis>("pirate_analyze_network", { characterId });
}

/**
 * Prédit le fit probable d'un pilote depuis ses pertes zKillboard récentes,
 * avec repli sur la doctrine corpo/alliance pour les coques jamais perdues.
 */
export function predictFit(
  characterId: number,
  corporationId: number | null,
  allianceId: number | null,
): Promise<FitPrediction> {
  return invoke<FitPrediction>("pirate_predict_fit", {
    characterId,
    corporationId,
    allianceId,
  });
}

/** Analyse un blob de local-chat / liste de membres collé. */
export function analyzeLocal(text: string): Promise<PilotIntel[]> {
  track("pirate_analyzed", { mode: "local" });
  return invoke<PilotIntel[]>("pirate_analyze_local", { text });
}

/**
 * Pose ou retire (tag = null) un tag de watchlist pour un personnage.
 * Omettre `note` préserve la note existante ; passer une string (y compris "")
 * la fixe explicitement.
 */
export function setWatchTag(
  characterId: number,
  tag: WatchTag | null,
  note?: string,
): Promise<void> {
  return invoke("pirate_set_watch_tag", { characterId, tag, note: note ?? null });
}

export function getWatchlist(): Promise<WatchlistEntry[]> {
  return invoke<WatchlistEntry[]>("pirate_get_watchlist");
}

// --- Helpers CDN images EVE (chargées directement par la webview) ---
export const portraitUrl = (id: number, size = 64) =>
  `https://images.evetech.net/characters/${id}/portrait?size=${size}`;
export const corpLogoUrl = (id: number, size = 32) =>
  `https://images.evetech.net/corporations/${id}/logo?size=${size}`;
export const allianceLogoUrl = (id: number, size = 32) =>
  `https://images.evetech.net/alliances/${id}/logo?size=${size}`;
export const shipIconUrl = (typeId: number, size = 32) =>
  `https://images.evetech.net/types/${typeId}/icon?size=${size}`;
/** Rendu 3D haute résolution d'une coque (aperçu au survol). */
export const shipRenderUrl = (typeId: number, size = 256) =>
  `https://images.evetech.net/types/${typeId}/render?size=${size}`;
/** Les modules partagent le même endpoint type-icon que les vaisseaux. */
export const typeIconUrl = shipIconUrl;
