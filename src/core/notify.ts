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

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

export type NotificationDelivery =
  | "sent"
  | "disabled"
  | "permission-denied"
  | "unsupported"
  | "suppressed"
  | "error";

/** L'utilisateur a-t-il activé les notifications (et est-on en desktop) ? */
export function notificationsEnabled(): boolean {
  return isTauri() && useSettings.getState().notifications;
}

/** État réel de la permission OS, distinct de la préférence utilisateur. */
export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isTauri() || typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    if (window.Notification.permission !== "default") {
      return window.Notification.permission;
    }
    return (await isPermissionGranted()) ? "granted" : "default";
  } catch (e) {
    log.warn("permission check failed", e);
    return "unsupported";
  }
}

/**
 * Émet une notification locale si activée et autorisée. Best-effort : toute
 * erreur est journalisée sans interrompre l'appelant.
 */
export async function notify(title: string, body?: string): Promise<NotificationDelivery> {
  if (!isTauri()) return "unsupported";
  if (!useSettings.getState().notifications) return "disabled";
  try {
    if (!(await isPermissionGranted())) return "permission-denied";
    sendNotification({ title, body });
    return "sent";
  } catch (e) {
    log.warn("notification failed", e);
    return "error";
  }
}

/**
 * Notifie uniquement quand la fenêtre n'est plus visible (onglet masqué,
 * fenêtre minimisée). Évite de doubler un résultat déjà affiché à l'écran.
 */
export async function notifyWhenAppHidden(
  title: string,
  body?: string,
): Promise<NotificationDelivery> {
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    return "suppressed";
  }
  return notify(title, body);
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
