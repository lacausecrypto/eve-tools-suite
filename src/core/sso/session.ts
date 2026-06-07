import { invoke, isTauri } from "@/core/runtime";

/** Personnage EVE authentifié via SSO. Aucun token n'est exposé au front. */
export interface CharacterSession {
  characterId: number;
  characterName: string;
  scopes: string[];
  /** Expiration de l'access token (ms epoch) — le backend le rafraîchit seul. */
  expiresAt: number;
}

/**
 * Client SSO. Le flux OAuth2 PKCE et le stockage des tokens (trousseau OS) sont
 * gérés par le backend Rust ; le front ne manipule que des sessions de personnage.
 */
export const sso = {
  /** Lance le login EVE SSO pour les scopes demandés. */
  async login(scopes: string[]): Promise<CharacterSession> {
    return invoke<CharacterSession>("sso_login", { scopes });
  },
  /** Déconnecte le personnage (efface le token du trousseau). */
  async logout(characterId: number): Promise<void> {
    return invoke<void>("sso_logout", { characterId });
  },
  /** Sessions actuellement connectées (sans tokens). */
  async sessions(): Promise<CharacterSession[]> {
    if (!isTauri()) return [];
    return invoke<CharacterSession[]>("sso_sessions");
  },
  /** Disponible uniquement en application desktop (Tauri). */
  available(): boolean {
    return isTauri();
  },
};
