/**
 * Auto-update (desktop) — fine couche au-dessus de `@tauri-apps/plugin-updater`.
 * Vérifie GitHub Releases (endpoint + clé publique dans `tauri.conf.json`),
 * télécharge la mise à jour **signée**, l'installe puis relance l'app.
 *
 * Les plugins sont importés **dynamiquement** : aucun chargement hors desktop
 * (web-dev), et pas d'impact si l'API updater est absente.
 */
import type { Update } from "@tauri-apps/plugin-updater";
import { isTauri } from "@/core/runtime";
import { logger } from "@/core/log";

const log = logger("update");

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  notes?: string;
}

/** Mise à jour trouvée par `checkForUpdate`, mémorisée pour l'installation. */
let pending: Update | null = null;

/**
 * Vérifie la disponibilité d'une mise à jour. Renvoie `null` si à jour, hors
 * desktop, ou en cas d'erreur réseau (silencieux — une MAJ n'est jamais bloquante).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;
    pending = update;
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body ?? undefined,
    };
  } catch (e) {
    log.info("vérification de mise à jour indisponible", e);
    return null;
  }
}

/**
 * Télécharge et installe la mise à jour en attente, puis relance l'app.
 * `onProgress` reçoit un pourcentage 0–100, ou `null` si la taille est inconnue.
 */
export async function installUpdate(
  onProgress?: (percent: number | null) => void,
): Promise<void> {
  if (!pending) return;
  let total = 0;
  let received = 0;
  await pending.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength ?? 0;
        onProgress?.(total ? 0 : null);
        break;
      case "Progress":
        received += event.data.chunkLength;
        onProgress?.(total ? Math.min(100, Math.round((received / total) * 100)) : null);
        break;
      case "Finished":
        onProgress?.(100);
        break;
    }
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
