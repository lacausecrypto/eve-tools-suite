/**
 * Notifications locales **opt-in** (desktop). Aucune notification n'est émise
 * tant que l'utilisateur ne l'a pas activée dans les Réglages, et l'autorisation
 * système est demandée à la première utilisation. No-op hors Tauri.
 */
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { isTauri } from "@/core/runtime";
import { useSettings } from "@/core/settings";
import { logger } from "@/core/log";

const log = logger("notify");

/** L'utilisateur a-t-il activé les notifications (et est-on en desktop) ? */
export function notificationsEnabled(): boolean {
  return isTauri() && useSettings.getState().notifications;
}

/**
 * Émet une notification locale si activée et autorisée. Best-effort : toute
 * erreur est journalisée sans interrompre l'appelant.
 */
export async function notify(title: string, body?: string): Promise<void> {
  if (!notificationsEnabled()) return;
  try {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (!granted) return;
    sendNotification({ title, body });
  } catch (e) {
    log.warn("notification failed", e);
  }
}

/** Demande l'autorisation système (appelée à l'activation du réglage). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch (e) {
    log.warn("permission request failed", e);
    return false;
  }
}
