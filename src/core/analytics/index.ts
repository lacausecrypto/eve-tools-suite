/**
 * Produit analytics — PostHog, opt-in strict et sans contenu EVE/joueur.
 * Les propriétés sont en allowlist : les valeurs arbitraires ne sont jamais envoyées.
 */
import posthog from "posthog-js";
import { APP, POSTHOG } from "@/core/app";
import { isTauri } from "@/core/runtime";
import { useSettings, type AnalyticsConsent } from "@/core/settings";
import { logger } from "@/core/log";

const log = logger("analytics");
let started = false;

const SAFE_PROPERTIES = new Set([
  "tool", "platform", "landing_path", "referrer", "runtime", "app_version",
  "success", "source", "count", "items", "duration_ms", "category",
]);
const SAFE_ENUMS: Record<string, Set<string>> = {
  tool: new Set(["mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy", "unknown"]),
  platform: new Set(["web", "desktop", "windows", "macos", "linux", "unknown"]),
  runtime: new Set(["web", "desktop"]),
  source: new Set(["landing", "launcher", "deep_link", "unknown"]),
  landing_path: new Set(["/", "/#download", "/#tools", "/#features", "/download", "/unknown"]),
  referrer: new Set(["direct", "search", "social", "github", "other", "unknown"]),
  category: new Set(["web", "desktop", "tool"]),
};

export function analyticsConfigured(): boolean {
  return POSTHOG.key.length > 0 && POSTHOG.host.length > 0;
}

/** Fail-closed: seules des propriétés explicitement autorisées et typées passent. */
export function sanitizeEventProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!SAFE_PROPERTIES.has(key)) continue;
    const allowed = SAFE_ENUMS[key];
    if (allowed) {
      if (typeof value === "string" && allowed.has(value)) out[key] = value;
      continue;
    }
    if (key === "success" && typeof value === "boolean") out[key] = value;
    if (["count", "items", "duration_ms"].includes(key) &&
        typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000) out[key] = value;
  }
  return out;
}

function startAnalytics(): void {
  if (started || !analyticsConfigured()) return;
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
  posthog.register({ app_version: APP.version, runtime: isTauri() ? "desktop" : "web" });
  started = true;
}

function applyConsent(granted: boolean): void {
  if (!analyticsConfigured()) return;
  if (granted) {
    startAnalytics();
    posthog.opt_in_capturing();
    trackDesktopFirstOpen();
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

export function track(event: string, props?: Record<string, unknown>): void {
  if (!started || posthog.has_opted_out_capturing()) return;
  try {
    const safe = props ? sanitizeEventProps(props) : undefined;
    posthog.capture(event, safe);
  } catch (e) {
    log.warn("capture échouée", e);
  }
}

/** Événements de cycle de vie desktop uniquement, sans identifiant ni contenu utilisateur. */
export function trackDesktopFirstOpen(): void {
  if (!isTauri() || !started || posthog.has_opted_out_capturing()) return;
  try {
    const key = "ets:analytics:first-open-tracked";
    if (localStorage.getItem(key) === "1") return;
    track("app_first_opened", { platform: "desktop", source: "launcher" });
    localStorage.setItem(key, "1");
  } catch (e) {
    log.warn("first-open marker unavailable", e);
  }
}

export function trackWebToolStarted(tool: string): void {
  if (isTauri()) return;
  track("web_tool_started", { tool: SAFE_ENUMS.tool.has(tool) ? tool : "unknown", platform: "web" });
}

export function trackWebToolResultSucceeded(tool: string): void {
  if (isTauri()) return;
  track("web_tool_result_succeeded", { tool: SAFE_ENUMS.tool.has(tool) ? tool : "unknown", platform: "web", success: true });
}
