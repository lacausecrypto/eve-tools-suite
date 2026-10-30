/**
 * Produit analytics — PostHog, opt-in strict et sans contenu EVE/joueur.
 * Chaque événement possède son propre schéma : une propriété prévue pour un
 * autre événement, ou une valeur libre, est rejetée avant l'envoi.
 */
import posthog from "posthog-js";
import { APP, POSTHOG } from "@/core/app";
import { isTauri } from "@/core/runtime";
import { useSettings, type AnalyticsConsent } from "@/core/settings";
import { logger } from "@/core/log";

const log = logger("analytics");
let started = false;
let openedThisRuntime = false;
let sessionNumber = 1;

const FIRST_OPEN_KEY = "ets:analytics:first-open-tracked";
const JOURNEY_STARTED_AT_KEY = "ets:analytics:journey-started-at";
const SESSION_COUNT_KEY = "ets:analytics:session-count";
const ACTIVATION_KEY = "ets:analytics:activation-tracked";
const ACTIVATION_ELIGIBLE_KEY = "ets:analytics:activation-eligible";

export type AnalyticsTool = "mining" | "pirate" | "pi" | "loss" | "skills" | "industry" | "market" | "trade" | "atelier" | "activity" | "abyssal" | "appraisal" | "lp" | "refine" | "academy" | "unknown";
type Tool = AnalyticsTool;
type TourId = Exclude<Tool, "unknown"> | "shell";
type MarketScope = "forge" | "domain" | "sinq" | "heimatar" | "metropolis" | "hubs";
export type ActivationAction =
  | "fit_analyzed" | "fit_generated" | "appraisal_run" | "abyssal_evaluated"
  | "lp_store_computed" | "activity_loot_valued" | "mining_session_started"
  | "industry_esi_import" | "pirate_analyzed" | "loss_analyzed"
  | "skills_esi_import" | "trade_station_scanned" | "market_load_succeeded"
  | "pi_setup_saved" | "refine_calculated" | "academy_lesson_completed";

export interface AnalyticsEventMap {
  app_opened: { language: "fr" | "en" };
  app_first_opened: { platform: "desktop"; source: "launcher" };
  tool_opened: { tool: Tool };
  tour_started: { tour_id: TourId; steps: number };
  tour_step_viewed: { tour_id: TourId; step: number };
  tour_completed: { tour_id: TourId; step: number };
  tour_skipped: { tour_id: TourId; step: number };
  fit_analyzed: Record<string, never>;
  fit_generated: {
    role: "ratting" | "mission" | "abyssal" | "brawl" | "kite" | "tackle" | "mining" | "explore";
    weapon: "auto" | "hybrid" | "projectile" | "laser" | "missile" | "drone";
    tank: "auto" | "armor" | "shield";
    range: "close" | "long";
  };
  appraisal_run: { vwap: boolean; items: number };
  abyssal_evaluated: Record<string, never>;
  lp_store_computed: { basis: "sell" | "buy" };
  activity_loot_valued: { lines: number };
  mining_session_started: { members: number };
  industry_esi_import: { kind: "jobs" | "assets" | "wallet" };
  pirate_analyzed: { mode: "network" | "local" };
  loss_analyzed: { source: "killmail" | "latest" };
  skills_esi_import: Record<string, never>;
  trade_station_scanned: Record<string, never>;
  market_item_selected: { scope: MarketScope };
  market_load_succeeded: { scope: MarketScope; duration_ms: number; count: number };
  market_load_failed: { scope: MarketScope; duration_ms: number };
  pi_setup_saved: Record<string, never>;
  refine_calculated: { mode: "reprocess" | "compress" };
  academy_lesson_completed: Record<string, never>;
  activation_completed: {
    tool: Exclude<Tool, "unknown">;
    activation_action: ActivationAction;
    activation_session: number;
    time_to_value_ms: number;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
type Validator = (value: unknown) => boolean;
type Rules = Partial<Record<string, Validator>>;

const oneOf = <T extends string>(...values: T[]): Validator => {
  const allowed = new Set<string>(values);
  return (value) => typeof value === "string" && allowed.has(value);
};
const boundedNumber = (max = 1_000_000): Validator =>
  (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
const bool: Validator = (value) => typeof value === "boolean";

const tools = oneOf("mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy", "unknown");
const TOOL_NAMES = new Set<AnalyticsTool>(["mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy"]);
const tours = oneOf("shell", "mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy");
const scopes = oneOf("forge", "domain", "sinq", "heimatar", "metropolis", "hubs");
const activationActions = oneOf(
  "fit_analyzed", "fit_generated", "appraisal_run", "abyssal_evaluated",
  "lp_store_computed", "activity_loot_valued", "mining_session_started",
  "industry_esi_import", "pirate_analyzed", "loss_analyzed",
  "skills_esi_import", "trade_station_scanned", "market_load_succeeded",
  "pi_setup_saved", "refine_calculated", "academy_lesson_completed",
);

const EVENT_RULES: Record<AnalyticsEventName, Rules> = {
  app_opened: { language: oneOf("fr", "en") },
  app_first_opened: { platform: oneOf("desktop"), source: oneOf("launcher") },
  tool_opened: { tool: tools },
  tour_started: { tour_id: tours, steps: boundedNumber(100) },
  tour_step_viewed: { tour_id: tours, step: boundedNumber(100) },
  tour_completed: { tour_id: tours, step: boundedNumber(100) },
  tour_skipped: { tour_id: tours, step: boundedNumber(100) },
  fit_analyzed: {},
  fit_generated: {
    role: oneOf("ratting", "mission", "abyssal", "brawl", "kite", "tackle", "mining", "explore"),
    weapon: oneOf("auto", "hybrid", "projectile", "laser", "missile", "drone"),
    tank: oneOf("auto", "armor", "shield"),
    range: oneOf("close", "long"),
  },
  appraisal_run: { vwap: bool, items: boundedNumber() },
  abyssal_evaluated: {},
  lp_store_computed: { basis: oneOf("sell", "buy") },
  activity_loot_valued: { lines: boundedNumber() },
  mining_session_started: { members: boundedNumber(10_000) },
  industry_esi_import: { kind: oneOf("jobs", "assets", "wallet") },
  pirate_analyzed: { mode: oneOf("network", "local") },
  loss_analyzed: { source: oneOf("killmail", "latest") },
  skills_esi_import: {},
  trade_station_scanned: {},
  market_item_selected: { scope: scopes },
  market_load_succeeded: { scope: scopes, duration_ms: boundedNumber(), count: boundedNumber() },
  market_load_failed: { scope: scopes, duration_ms: boundedNumber() },
  pi_setup_saved: {},
  refine_calculated: { mode: oneOf("reprocess", "compress") },
  academy_lesson_completed: {},
  activation_completed: {
    tool: tools,
    activation_action: activationActions,
    activation_session: boundedNumber(100_000),
    time_to_value_ms: boundedNumber(31_536_000_000),
  },
};

const ACTIVATION_BY_EVENT: Partial<Record<AnalyticsEventName, {
  tool: Exclude<Tool, "unknown">;
  action: ActivationAction;
}>> = {
  fit_analyzed: { tool: "atelier", action: "fit_analyzed" },
  fit_generated: { tool: "atelier", action: "fit_generated" },
  appraisal_run: { tool: "appraisal", action: "appraisal_run" },
  abyssal_evaluated: { tool: "abyssal", action: "abyssal_evaluated" },
  lp_store_computed: { tool: "lp", action: "lp_store_computed" },
  activity_loot_valued: { tool: "activity", action: "activity_loot_valued" },
  mining_session_started: { tool: "mining", action: "mining_session_started" },
  industry_esi_import: { tool: "industry", action: "industry_esi_import" },
  pirate_analyzed: { tool: "pirate", action: "pirate_analyzed" },
  loss_analyzed: { tool: "loss", action: "loss_analyzed" },
  skills_esi_import: { tool: "skills", action: "skills_esi_import" },
  trade_station_scanned: { tool: "trade", action: "trade_station_scanned" },
  market_load_succeeded: { tool: "market", action: "market_load_succeeded" },
  pi_setup_saved: { tool: "pi", action: "pi_setup_saved" },
  refine_calculated: { tool: "refine", action: "refine_calculated" },
  academy_lesson_completed: { tool: "academy", action: "academy_lesson_completed" },
};

export function analyticsConfigured(): boolean {
  return POSTHOG.key.length > 0 && POSTHOG.host.length > 0;
}

/** Normalise un id persistant ou futur sans jamais envoyer une chaîne libre. */
export function analyticsTool(value: string): AnalyticsTool {
  return TOOL_NAMES.has(value as AnalyticsTool) ? value as AnalyticsTool : "unknown";
}

export function activationForEvent(event: AnalyticsEventName) {
  return ACTIVATION_BY_EVENT[event] ?? null;
}

function beginJourneySession(): { number: number; first: boolean } {
  try {
    const first = localStorage.getItem(FIRST_OPEN_KEY) !== "1";
    if (!localStorage.getItem(ACTIVATION_ELIGIBLE_KEY)) {
      localStorage.setItem(ACTIVATION_ELIGIBLE_KEY, first ? "1" : "0");
    }
    const previous = Number(localStorage.getItem(SESSION_COUNT_KEY)) || 0;
    sessionNumber = previous + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(sessionNumber));
    if (!localStorage.getItem(JOURNEY_STARTED_AT_KEY)) {
      localStorage.setItem(JOURNEY_STARTED_AT_KEY, String(Date.now()));
    }
    return { number: sessionNumber, first };
  } catch {
    sessionNumber = 1;
    return { number: 1, first: true };
  }
}

/** Fail-closed : seules les propriétés du schéma de cet événement passent. */
export function sanitizeEventProps<E extends AnalyticsEventName>(
  event: E,
  props: Record<string, unknown>,
): Partial<AnalyticsEventMap[E]> {
  const out: Record<string, unknown> = {};
  const rules = EVENT_RULES[event];
  for (const [key, value] of Object.entries(props)) {
    if (rules[key]?.(value)) out[key] = value;
  }
  return out as Partial<AnalyticsEventMap[E]>;
}

function startAnalytics(): void {
  if (started || !analyticsConfigured()) return;
  const journey = beginJourneySession();
  posthog.init(POSTHOG.key, {
    api_host: POSTHOG.host,
    persistence: "localStorage",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    respect_dnt: true,
    person_profiles: "identified_only",
    opt_out_capturing_by_default: true,
    sanitize_properties: (props) => {
      const p = props as Record<string, unknown>;
      for (const key of Object.keys(p)) {
        if (key.startsWith("$")) delete p[key];
      }
      return p;
    },
    loaded: () => log.info("PostHog chargé (en attente d'opt-in)"),
  });
  posthog.register({
    product: "eve_tools_suite",
    analytics_schema_version: 2,
    journey_schema_version: 1,
    app_version: APP.version,
    runtime: isTauri() ? "desktop" : "web",
    app_session_number: journey.number,
    is_first_session: journey.first,
  });
  started = true;
}

function applyConsent(granted: boolean): void {
  if (!analyticsConfigured()) return;
  if (granted) {
    startAnalytics();
    posthog.opt_in_capturing();
    trackDesktopFirstOpen();
    trackAppOpened(useSettings.getState().language);
  } else if (started) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
}

export function bootAnalytics(): void {
  if (!analyticsConfigured()) return;
  if (useSettings.getState().analyticsConsent === "granted") applyConsent(true);
}

export function setConsent(choice: Exclude<AnalyticsConsent, "unset">): void {
  useSettings.getState().setAnalyticsConsent(choice);
  applyConsent(choice === "granted");
}

export function track<E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEventMap[E] extends Record<string, never>
    ? [props?: AnalyticsEventMap[E]]
    : [props: AnalyticsEventMap[E]]
): void {
  if (!started || posthog.has_opted_out_capturing()) return;
  try {
    const props = args[0] as Record<string, unknown> | undefined;
    posthog.capture(event, props ? sanitizeEventProps(event, props) : undefined);
    const activation = activationForEvent(event);
    if (activation) trackActivation(activation.tool, activation.action);
  } catch (e) {
    log.warn("capture échouée", e);
  }
}

/** Une seule ouverture par exécution, y compris lorsque l'opt-in arrive après le montage de l'app. */
export function trackAppOpened(language: "fr" | "en"): void {
  if (openedThisRuntime || !started || posthog.has_opted_out_capturing()) return;
  openedThisRuntime = true;
  track("app_opened", { language });
}

function trackActivation(tool: Exclude<Tool, "unknown">, action: ActivationAction): void {
  if (!isTauri()) return;
  try {
    // Ne transforme pas les utilisateurs pré-P1 en faux « nouveaux activés ».
    if (localStorage.getItem(ACTIVATION_ELIGIBLE_KEY) !== "1") return;
    if (localStorage.getItem(ACTIVATION_KEY) === "1") return;
    const now = Date.now();
    const startedAt = Number(localStorage.getItem(JOURNEY_STARTED_AT_KEY)) || now;
    const props: AnalyticsEventMap["activation_completed"] = {
      tool,
      activation_action: action,
      activation_session: sessionNumber,
      time_to_value_ms: Math.min(Math.max(0, now - startedAt), 31_536_000_000),
    };
    posthog.capture("activation_completed", sanitizeEventProps("activation_completed", props));
    localStorage.setItem(ACTIVATION_KEY, "1");
  } catch (e) {
    log.warn("activation marker unavailable", e);
  }
}

/** Événements de cycle de vie desktop uniquement, sans identifiant ni contenu utilisateur. */
export function trackDesktopFirstOpen(): void {
  if (!isTauri() || !started || posthog.has_opted_out_capturing()) return;
  try {
    if (!localStorage.getItem(JOURNEY_STARTED_AT_KEY)) {
      localStorage.setItem(JOURNEY_STARTED_AT_KEY, String(Date.now()));
    }
    if (localStorage.getItem(FIRST_OPEN_KEY) === "1") return;
    track("app_first_opened", { platform: "desktop", source: "launcher" });
    localStorage.setItem(FIRST_OPEN_KEY, "1");
  } catch (e) {
    log.warn("first-open marker unavailable", e);
  }
}
