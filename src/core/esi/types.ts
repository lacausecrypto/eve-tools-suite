/** Réponse normalisée d'un appel ESI (corps + en-têtes utiles à la conformité). */
export interface EsiResponse<T> {
  data: T;
  status: number;
  /** Date d'expiration du cache (header `expires`), en ms epoch — 0 si absent. */
  expires: number;
  /** Pagination ESI (header `x-pages`), 1 par défaut. */
  pages: number;
  /** Quota d'erreurs ESI restant sur la fenêtre courante (header dédié). */
  errorLimitRemain: number;
}

export interface EsiRequest {
  path: string; // ex. "/markets/10000002/orders/"
  query?: Record<string, string | number | undefined>;
  method?: "GET" | "POST";
  body?: unknown;
  /**
   * Id du personnage pour un appel **authentifié** : le backend pose le Bearer
   * (token rafraîchi depuis le trousseau). Absent ⇒ ESI publique.
   */
  characterId?: number;
}
