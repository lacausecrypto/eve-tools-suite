/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clé projet PostHog (publique). Vide = analytics désactivée. */
  readonly VITE_POSTHOG_KEY?: string;
  /** Hôte PostHog auto-hébergé, ex. `https://posthog.mondomaine.tld`. */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
