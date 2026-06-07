import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";
import { sso, type CharacterSession } from "@/core/sso/session";
import { DEFAULT_SCOPES } from "@/core/app";
import { logger } from "@/core/log";

const log = logger("account");

interface AccountState {
  /** Personnages connectés (sessions sans tokens, fournies par le backend). */
  sessions: CharacterSession[];
  /** Personnage actif partagé entre les modules (contexte courant). */
  activeId: number | null;
  loading: boolean;
  error: string | null;
  /** Recharge la liste des sessions depuis le backend (trousseau OS). */
  refresh: () => Promise<void>;
  /** Lance le login EVE SSO et ajoute/rafraîchit le personnage. */
  login: (scopes?: string[]) => Promise<void>;
  /** Déconnecte un personnage (efface son token du trousseau). */
  logout: (characterId: number) => Promise<void>;
  /** Sélectionne le personnage actif (contexte partagé). */
  setActive: (characterId: number | null) => void;
}

/** Réconcilie l'`activeId` avec les sessions présentes (défaut = 1er perso). */
function reconcileActive(
  sessions: CharacterSession[],
  activeId: number | null,
): number | null {
  if (activeId != null && sessions.some((s) => s.characterId === activeId))
    return activeId;
  return sessions[0]?.characterId ?? null;
}

/**
 * Gestionnaire de comptes EVE — état partagé de la suite. Multi-personnages via
 * SSO ; aucun token n'est exposé ici (le backend Rust gère trousseau + refresh).
 * Seul l'`activeId` est persisté ; les sessions sont rechargées au démarrage.
 */
export const useAccounts = create<AccountState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      loading: false,
      error: null,

      refresh: async () => {
        if (!sso.available()) return;
        try {
          const sessions = await sso.sessions();
          set((s) => ({
            sessions,
            activeId: reconcileActive(sessions, s.activeId),
            error: null,
          }));
        } catch (e) {
          log.error("refresh sessions failed", e);
          set({ error: String(e) });
        }
      },

      login: async (scopes = DEFAULT_SCOPES) => {
        set({ loading: true, error: null });
        try {
          const session = await sso.login(scopes);
          set((s) => {
            const sessions = [
              ...s.sessions.filter(
                (x) => x.characterId !== session.characterId,
              ),
              session,
            ];
            return { sessions, activeId: session.characterId, loading: false };
          });
        } catch (e) {
          log.error("login failed", e);
          set({ error: String(e), loading: false });
          throw e;
        }
      },

      logout: async (characterId) => {
        try {
          await sso.logout(characterId);
        } catch (e) {
          log.error("logout failed", e);
          set({ error: String(e) });
        }
        set((s) => {
          const sessions = s.sessions.filter(
            (x) => x.characterId !== characterId,
          );
          return { sessions, activeId: reconcileActive(sessions, s.activeId) };
        });
      },

      setActive: (characterId) => {
        const { sessions } = get();
        if (characterId != null && !sessions.some((s) => s.characterId === characterId))
          return;
        set({ activeId: characterId });
      },
    }),
    {
      name: "accounts",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("shell")),
      // Ne persiste que la sélection ; les sessions viennent du backend.
      partialize: (s) => ({ activeId: s.activeId }),
    },
  ),
);

/** Session du personnage actif (ou `null`). Utilitaire hors React. */
export function activeSession(): CharacterSession | null {
  const { sessions, activeId } = useAccounts.getState();
  return sessions.find((s) => s.characterId === activeId) ?? null;
}
