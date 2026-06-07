/**
 * Export / import des setups PI au **format documenté de l'outil** (.json) —
 * fiable et sous notre contrôle (sauvegarde et partage entre joueurs).
 *
 * Note : l'export vers le **format Templates CCP officiel** (importable in-game)
 * nécessite des enums internes CCP (codes bâtiment, ids de schématiques, géométrie
 * lat/long, routes) non publics — voir la ROADMAP M5.
 */
import type { ExtractionConfig, PiSetup } from "./setup";

const FILE_KIND = "eve-pi-sim/setups";
const FILE_VERSION = 1;

interface ExportFile {
  app: string;
  kind: string;
  version: number;
  exportedAt: string;
  setups: PiSetup[];
}

/** Sérialise les setups au format d'échange de l'outil. */
export function exportSetupsJson(setups: PiSetup[], now: string): string {
  const file: ExportFile = {
    app: "EVE PI Sim",
    kind: FILE_KIND,
    version: FILE_VERSION,
    exportedAt: now,
    setups,
  };
  return JSON.stringify(file, null, 2);
}

const OUTPUTS = new Set(["raw", "p1"]);

function isConfig(o: unknown): o is ExtractionConfig {
  if (!o || typeof o !== "object") return false;
  const c = o as Record<string, unknown>;
  return (
    typeof c.planet === "string" &&
    typeof c.rawId === "string" &&
    typeof c.heads === "number" &&
    typeof c.cycleSec === "number" &&
    typeof c.qtyPerCycle === "number" &&
    typeof c.output === "string" &&
    OUTPUTS.has(c.output as string)
  );
}

/** Parse un fichier d'échange et renvoie des setups valides (tolérant). */
export function parseSetupsJson(text: string): PiSetup[] {
  const obj = JSON.parse(text) as unknown;
  const arr: unknown[] = Array.isArray(obj)
    ? obj
    : ((obj as ExportFile)?.setups ?? []);
  if (!Array.isArray(arr)) throw new Error("format invalide");
  return arr.filter(isConfig) as PiSetup[];
}

/** Télécharge un texte JSON sous forme de fichier (web + webview Tauri). */
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
