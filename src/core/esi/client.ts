import { ENDPOINTS, ESI_USER_AGENT } from "@/core/app";
import { isTauri, invoke } from "@/core/runtime";
import type { EsiRequest, EsiResponse } from "./types";

/**
 * Client ESI **conforme aux règles CCP**.
 *
 * Règles appliquées :
 * - **Identification** : User-Agent explicite (nom/version + contact). Les
 *   navigateurs interdisant de fixer ce header en `fetch`, en production
 *   (desktop Tauri) toute requête passe par le backend Rust qui le pose et
 *   surveille le quota d'erreurs ESI. En dev web, on tape l'ESI en direct.
 * - **Quota d'erreurs** (« error limit », 100 / 60 s) : on lit l'en-tête
 *   `x-esi-error-limit-remain` et on s'arrête au seuil de sécurité.
 * - **Cache** : on respecte le header `expires` (pas de polling agressif).
 * - **Pagination** : exposée via `x-pages`.
 */

const ERROR_LIMIT_SAFE_FLOOR = 10; // on cesse d'émettre sous ce seuil
let errorLimitRemain = 100;

// Cache mémoire : on respecte l'en-tête `expires` de l'ESI (pas de polling
// agressif). Clé = méthode + URL. Seules les requêtes GET sont mises en cache.
const cache = new Map<string, EsiResponse<unknown>>();

function cacheKey(req: EsiRequest): string {
  const m = req.method ?? "GET";
  // Le contexte authentifié est isolé par personnage (données privées).
  const who = req.characterId != null ? `@${req.characterId}` : "";
  return `${m}${who} ${buildUrl(req.path, req.query)}`;
}

function buildUrl(path: string, query?: EsiRequest["query"]): string {
  const url = new URL(ENDPOINTS.esiBase + path);
  url.searchParams.set("datasource", "tranquility");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Appel ESI bas niveau. Renvoie corps + métadonnées (cache, pages, quota). */
export async function esi<T>(req: EsiRequest): Promise<EsiResponse<T>> {
  const method = req.method ?? "GET";
  const key = cacheKey(req);

  // Cache : on sert depuis le cache tant que `expires` n'est pas dépassé (GET).
  if (method === "GET") {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
      return hit as EsiResponse<T>;
    }
  }

  if (errorLimitRemain <= ERROR_LIMIT_SAFE_FLOOR) {
    throw new Error(
      `Quota d'erreurs ESI proche de la limite (${errorLimitRemain}). Pause de sécurité.`
    );
  }

  let res: EsiResponse<T>;
  if (isTauri()) {
    // Production : le backend Rust pose le User-Agent, le Bearer (si authentifié)
    // et surveille le quota.
    res = await invoke<EsiResponse<T>>("esi_request", {
      path: req.path,
      query: req.query ?? {},
      method,
      body: req.body ?? null,
      characterId: req.characterId ?? null,
    });
  } else {
    // Dev web : appel direct (User-Agent et Bearer non posables ici → public).
    if (req.characterId != null) {
      throw new Error(
        "Appel ESI authentifié indisponible hors application desktop."
      );
    }
    const r = await fetch(buildUrl(req.path, req.query), {
      method,
      headers: {
        Accept: "application/json",
        "X-User-Agent": ESI_USER_AGENT,
        ...(req.body ? { "Content-Type": "application/json" } : {}),
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    const remainHeader = r.headers.get("x-esi-error-limit-remain");
    if (remainHeader) errorLimitRemain = parseInt(remainHeader, 10);
    if (!r.ok) throw new Error(`ESI ${r.status} sur ${req.path}`);
    const expiresHeader = r.headers.get("expires");
    const pagesHeader = r.headers.get("x-pages");
    res = {
      data: (await r.json()) as T,
      status: r.status,
      expires: expiresHeader ? Date.parse(expiresHeader) : 0,
      pages: pagesHeader ? parseInt(pagesHeader, 10) : 1,
      errorLimitRemain,
    };
  }

  errorLimitRemain = res.errorLimitRemain;

  // Le backend Rust renvoie toujours `Ok` (statut + corps) ; on transforme ici
  // tout statut d'erreur en exception (la branche web jette déjà sur `!r.ok`).
  // Un 401/403 sur un appel authentifié = token expiré ou **scope manquant** :
  // message explicite invitant à reconnecter le personnage.
  if (res.status >= 400) {
    const detail = esiErrorDetail(res.data);
    if (req.characterId != null && (res.status === 401 || res.status === 403)) {
      throw new Error(
        `ESI ${res.status} : accès refusé${detail ? ` (${detail})` : ""}. ` +
          `Reconnecte le personnage pour accorder les permissions requises.`,
      );
    }
    throw new Error(`ESI ${res.status} sur ${req.path}${detail ? ` : ${detail}` : ""}`);
  }

  if (method === "GET" && res.expires > Date.now()) {
    cache.set(key, res as EsiResponse<unknown>);
  }
  return res;
}

/** Extrait le message d'erreur d'un corps de réponse ESI (`{ error: "…" }`). */
function esiErrorDetail(data: unknown): string | null {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const msg = obj.error ?? obj.message;
    if (typeof msg === "string") return msg;
  }
  return null;
}

/** Vide le cache ESI (forcer un rafraîchissement). */
export function clearEsiCache(): void {
  cache.clear();
}

/** Raccourci GET (ESI publique). */
export async function esiGet<T>(
  path: string,
  query?: EsiRequest["query"]
): Promise<T> {
  return (await esi<T>({ path, query })).data;
}

/**
 * Raccourci GET **authentifié** : appel ESI au nom d'un personnage (Bearer posé
 * par le backend). Ex. `esiGetAuth("/characters/123/skills/", 123)`.
 */
export async function esiGetAuth<T>(
  path: string,
  characterId: number,
  query?: EsiRequest["query"]
): Promise<T> {
  return (await esi<T>({ path, query, characterId })).data;
}

/** Variante POST (ex. `/universe/names/` : ids → noms). */
export async function esiPost<T>(
  path: string,
  body: unknown,
  query?: EsiRequest["query"]
): Promise<T> {
  return (await esi<T>({ path, method: "POST", body, query })).data;
}

/** Quota d'erreurs ESI restant (pour l'affichage / diagnostic). */
export function esiErrorBudget(): number {
  return errorLimitRemain;
}
