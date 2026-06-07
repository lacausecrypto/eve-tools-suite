/**
 * Appels **tiers** (Fuzzwork, MutaMarket, Hoboleaks…) routés par le backend Rust
 * afin de poser un **User-Agent** identifiant l'app (la webview ne peut pas le
 * faire) — étiquette correcte et évite un bannissement côté fournisseur. En dev
 * web (hors Tauri), repli sur un `fetch` direct.
 */
import { invoke, isTauri } from "@/core/runtime";

export interface ThirdPartyResponse {
  status: number;
  body: string;
}

/** GET tiers avec User-Agent (via Rust en desktop). */
export async function thirdPartyGet(url: string): Promise<ThirdPartyResponse> {
  if (isTauri()) return invoke<ThirdPartyResponse>("third_party_get", { url });
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  return { status: res.status, body: await res.text() };
}

/** GET tiers + parse JSON ; lève si statut non-2xx ou corps invalide. */
export async function thirdPartyJson<T>(url: string): Promise<T> {
  const { status, body } = await thirdPartyGet(url);
  if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`);
  return JSON.parse(body) as T;
}
