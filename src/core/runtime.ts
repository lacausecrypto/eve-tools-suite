/**
 * Pont d'exécution : la suite tourne soit dans **Tauri** (desktop, backend Rust),
 * soit comme une **app web** (dev sur navigateur). Ce module isole la détection
 * et l'appel des commandes Rust pour que le reste du code reste agnostique.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Appelle une commande du backend Rust (uniquement en contexte Tauri). */
export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri()) {
    throw new Error(
      `Commande Tauri "${command}" indisponible hors application desktop.`
    );
  }
  return tauriInvoke<T>(command, args);
}
