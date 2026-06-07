import { isTauri } from "@/core/runtime";

/**
 * Ouvre une URL dans le navigateur par défaut. En desktop via le plugin opener
 * (import dynamique → pas chargé hors Tauri) ; en web-dev via `window.open`
 * (`noopener,noreferrer`).
 */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
