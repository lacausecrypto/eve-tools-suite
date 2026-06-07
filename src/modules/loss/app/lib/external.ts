import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@/core/runtime";

/** Ouvre une URL externe : navigateur système en desktop, onglet en web. */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      await openUrl(url);
      return;
    } catch {
      /* repli ci-dessous */
    }
  }
  if (typeof window !== "undefined")
    window.open(url, "_blank", "noopener,noreferrer");
}

/** URL zKillboard d'un killmail. */
export const zkillKillUrl = (id: number) => `https://zkillboard.com/kill/${id}/`;
