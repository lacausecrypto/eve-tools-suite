/**
 * Métadonnées de l'application — centralisées pour la conformité CCP.
 *
 * CCP exige que tout outil tiers utilisant l'API ESI s'identifie clairement
 * (User-Agent avec un contact) et respecte les conditions du « Developer License
 * Agreement ». Ces constantes alimentent le User-Agent ESI (posé côté Rust pour
 * la prod) et les mentions légales d'attribution affichées dans l'UI.
 *
 * ⚠️ Avant publication : renseigner CONTACT_EMAIL et, pour le SSO, l'identifiant
 * d'application enregistré sur https://developers.eveonline.com (ESI_CLIENT_ID).
 */
export const APP = {
  name: "EVE Tools Suite",
  slug: "eve-tools-suite",
  version: "0.1.4",
  /** Contact obligatoire dans le User-Agent ESI (CCP). À renseigner. */
  contactEmail: "lacausecrypto@gmail.com",
  repository: "https://github.com/lacausecrypto/eve-tools-suite",
} as const;

/** Politique de confidentialité (RGPD) — page publique liée depuis l'app. */
export const PRIVACY_URL =
  "https://github.com/lacausecrypto/eve-tools-suite/blob/main/PRIVACY.md";

/** User-Agent conforme aux recommandations CCP (nom/version + contact + source). */
export const ESI_USER_AGENT = `${APP.name}/${APP.version} (${APP.contactEmail}; +${APP.repository})`;

/** Endpoints officiels CCP. */
export const ENDPOINTS = {
  esiBase: "https://esi.evetech.net/latest",
  ssoAuthorize: "https://login.eveonline.com/v2/oauth/authorize",
  ssoToken: "https://login.eveonline.com/v2/oauth/token",
  ssoJwks: "https://login.eveonline.com/oauth/jwks",
  images: "https://images.evetech.net",
} as const;

/**
 * Application SSO enregistrée chez CCP (developers.eveonline.com).
 * Le client est « public » (desktop) → PKCE, pas de secret embarqué.
 * Redirect loopback géré par le backend Tauri.
 */
export const ESI_SSO = {
  clientId: "25e65145aa044cfdbaf2b710bdf8d767", // app enregistrée sur developers.eveonline.com (public/PKCE)
  callbackPort: 41789,
  callbackPath: "/sso/callback",
} as const;

/**
 * Catalogue des scopes ESI utilisés par la suite — **lecture seule**, au plus
 * juste (principe de moindre privilège pour la certification CCP, cf. M5).
 * Un module ne doit demander que les scopes dont il a besoin.
 */
export const ESI_SCOPES = {
  readSkills: "esi-skills.read_skills.v1",
  readSkillQueue: "esi-skills.read_skillqueue.v1",
  readWallet: "esi-wallet.read_character_wallet.v1",
  readAssets: "esi-assets.read_assets.v1",
  readIndustryJobs: "esi-industry.read_character_jobs.v1",
} as const;

/**
 * Scopes demandés par défaut à la connexion d'un personnage. **Fallback** : le
 * gestionnaire de comptes demande en réalité `requiredScopes()` (l'union dérivée
 * des manifestes — cf. `core/module/registry`), si bien qu'un seul login couvre
 * tous les outils sans 403. Cette liste statique reflète ce même ensemble pour
 * les appels `login()` sans argument et reste read-only / moindre privilège.
 *
 * Couvre exactement les endpoints authentifiés réellement appelés :
 *  - `/skills/`, `/attributes/`      → readSkills
 *  - `/skillqueue/`                  → readSkillQueue
 *  - `/wallet/`, `/wallet/transactions/` → readWallet
 *  - `/assets/`                      → readAssets
 *  - `/industry/jobs/`               → readIndustryJobs
 */
export const DEFAULT_SCOPES: string[] = [
  ESI_SCOPES.readSkills,
  ESI_SCOPES.readSkillQueue,
  ESI_SCOPES.readWallet,
  ESI_SCOPES.readAssets,
  ESI_SCOPES.readIndustryJobs,
];

/**
 * Configuration **analytics** (PostHog — Cloud EU par défaut, ou auto-hébergé via
 * `VITE_POSTHOG_HOST`). Lue depuis l'environnement Vite à la compilation
 * (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`). Si l'une des deux manque, l'analytics
 * est **totalement désactivée** (aucun chargement de PostHog, aucune requête).
 * Collecte **opt-in stricte** et anonyme — cf. `core/analytics`. La clé « projet »
 * PostHog est publique par conception (write-only, ingestion seule).
 */
export const POSTHOG = {
  key: (import.meta.env.VITE_POSTHOG_KEY ?? "").trim(),
  host: (import.meta.env.VITE_POSTHOG_HOST ?? "").trim(),
} as const;

/** Mention légale d'attribution CCP (à afficher dans l'app). */
export const CCP_ATTRIBUTION =
  "EVE Online et le logo EVE sont des marques déposées de CCP hf. Tous les droits " +
  "relatifs à ces marques appartiennent à CCP hf. Tous les autres éléments liés à " +
  "EVE Online sont la propriété de CCP hf. CCP hf. n'a en aucune manière approuvé " +
  "et n'est pas responsable du contenu ou du fonctionnement de cette application.";
