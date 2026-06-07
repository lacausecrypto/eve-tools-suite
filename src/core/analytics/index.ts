/**
 * Analytics produit — **PostHog** (Cloud EU par défaut, ou auto-hébergé selon
 * `VITE_POSTHOG_HOST`), conçu pour la conformité RGPD.
 *
 * Principes (cf. demande utilisateur + ePrivacy/RGPD) :
 * - **Opt-in strict** : PostHog n'est même pas chargé tant que l'utilisateur n'a
 *   pas explicitement consenti. Aucun événement n'est émis avant le consentement.
 * - **Anonyme** : aucun profil personne (`person_profiles: "identified_only"` et
 *   on n'appelle jamais `identify`). Le `distinct_id` est un UUID aléatoire local.
 * - **Sans PII ni données EVE** : on ne collecte jamais nom/ID de personnage,
 *   email, jetons, valeurs ISK, contenus saisis. Toutes les propriétés passent
 *   par un `sanitize` qui retire les champs sensibles (défense en profondeur).
 * - **Pas de cookies** (`persistence: "localStorage"`), pas d'autocapture DOM,
 *   pas de session recording, respect du Do-Not-Track.
 * - **Désactivable à tout moment** : révoquer le consentement coupe la collecte
 *   et réinitialise l'identifiant local.
 * - **Désactivée par défaut en l'absence de configuration** (`VITE_POSTHOG_*`).
 */
import posthog from "posthog-js";
import { APP, POSTHOG } from "@/core/app";
import { isTauri } from "@/core/runtime";
import { useSettings, type AnalyticsConsent } from "@/core/settings";
import { logger } from "@/core/log";

const log = logger("analytics");

/** `init()` de PostHog a-t-il été appelé ? (chargement effectif de la lib) */
let started = false;

/** Propriétés sensibles qu'on refuse d'émettre, par sécurité. */
const SENSITIVE_KEY = /token|secret|password|authorization|email|character|char_?name|char_?id|pilot|isk|wallet|name$|\$ip/i;

/** L'analytics est-elle configurée (clé + host fournis au build) ? */
export function analyticsConfigured(): boolean {
  return POSTHOG.key.length > 0 && POSTHOG.host.length > 0;
}

/**
 * Retire toute propriété au nom sensible (PII/EVE) et tout texte libre long.
 * Exportée pour test : garantit qu'aucune donnée perso ne peut transiter.
 */
export function sanitizeEventProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (typeof v === "string" && v.length > 120) continue; // pas de blobs/texte libre
    out[k] = v;
  }
  return out;
}

/**
 * Charge et initialise PostHog (idempotent). N'émet rien tant que l'opt-in n'est
 * pas accordé (`opt_out_capturing_by_default: true`).
 */
function startAnalytics(): void {
  if (started || !analyticsConfigured()) return;
  posthog.init(POSTHOG.key, {
    api_host: POSTHOG.host,
    // Vie privée :
    persistence: "localStorage", // pas de cookies
    autocapture: false, // pas de capture DOM automatique
    capture_pageview: false, // on n'envoie pas d'URL de page
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    respect_dnt: true,
    person_profiles: "identified_only", // events anonymes → aucun profil personne
    opt_out_capturing_by_default: true, // rien tant qu'on n'a pas opt_in
    // Défense en profondeur : neutralise les propriétés d'URL/référent locales.
    sanitize_properties: (props) => {
      const p = props as Record<string, unknown>;
      delete p.$current_url;
      delete p.$referrer;
      delete p.$referring_domain;
      delete p.$pathname;
      delete p.$host;
      return p;
    },
    loaded: () => log.info("PostHog chargé (en attente d'opt-in)"),
  });
  // Propriétés non-PII attachées à tous les événements de l'install.
  posthog.register({
    app_version: APP.version,
    runtime: isTauri() ? "desktop" : "web",
  });
  started = true;
}

/** Applique un choix de consentement à PostHog (charge/opt-in ou opt-out+reset). */
function applyConsent(granted: boolean): void {
  if (!analyticsConfigured()) return;
  if (granted) {
    startAnalytics();
    posthog.opt_in_capturing();
  } else if (started) {
    posthog.opt_out_capturing();
    posthog.reset(); // efface le distinct_id local
  }
}

/** Initialise l'analytics au démarrage selon le consentement persisté. */
export function bootAnalytics(): void {
  if (!analyticsConfigured()) return;
  if (useSettings.getState().analyticsConsent === "granted") applyConsent(true);
}

/** Enregistre le choix de consentement (persisté) et l'applique immédiatement. */
export function setConsent(choice: Exclude<AnalyticsConsent, "unset">): void {
  useSettings.getState().setAnalyticsConsent(choice);
  applyConsent(choice === "granted");
}

/**
 * Émet un événement produit. **No-op** si non configuré, non démarré, ou opt-out.
 * `event` doit être un nom stable (ex. `tool_opened`) ; `props` reste non-PII.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!started) return;
  if (posthog.has_opted_out_capturing()) return;
  try {
    posthog.capture(event, props ? sanitizeEventProps(props) : undefined);
  } catch (e) {
    log.warn("capture échouée", e);
  }
}
