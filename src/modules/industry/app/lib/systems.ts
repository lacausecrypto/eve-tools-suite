/**
 * Index de coût d'industrie par système — ESI **publique** `/industry/systems/`
 * (aucun login). Évite de saisir l'index à la main : on résout le nom du système
 * en id, on lit l'index de l'activité voulue. Le gros payload (tous les systèmes)
 * est mis en cache mémoire (respecte aussi le cache `expires` du client ESI).
 */
import { esiGet, esiPost } from "@/core/esi/client";
import type { ActivityType } from "./industry";

/** Clé d'activité ESI dans `cost_indices`. */
const ACTIVITY_KEY: Record<ActivityType, string> = {
  manufacturing: "manufacturing",
  reaction: "reaction",
};

interface SystemCostIndices {
  solar_system_id: number;
  cost_indices: { activity: string; cost_index: number }[];
}

let systemsCache: Map<number, SystemCostIndices> | null = null;
const nameIdCache = new Map<string, number>();

interface IdsResponse {
  systems?: { id: number; name: string }[];
}

/** Résout un nom de système solaire en id (`/universe/ids/`, caché). */
export async function resolveSystemId(name: string): Promise<number | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const cached = nameIdCache.get(key);
  if (cached) return cached;
  try {
    const data = await esiPost<IdsResponse>("/universe/ids/", [name.trim()]);
    const match = data.systems?.[0];
    if (match) {
      nameIdCache.set(key, match.id);
      return match.id;
    }
  } catch {
    /* introuvable */
  }
  return null;
}

async function loadSystems(): Promise<Map<number, SystemCostIndices>> {
  if (systemsCache) return systemsCache;
  const map = new Map<number, SystemCostIndices>();
  try {
    const rows = await esiGet<SystemCostIndices[]>("/industry/systems/");
    for (const r of rows) map.set(r.solar_system_id, r);
  } catch {
    /* indisponible → null en aval */
  }
  systemsCache = map;
  return map;
}

/**
 * Index de coût (0–1) d'un système pour une activité, ou `null` si le système
 * est introuvable / sans index pour cette activité.
 */
export async function fetchSystemCostIndex(
  systemName: string,
  activity: ActivityType,
): Promise<number | null> {
  const id = await resolveSystemId(systemName);
  if (id == null) return null;
  const systems = await loadSystems();
  const entry = systems.get(id);
  if (!entry) return null;
  const idx = entry.cost_indices.find((c) => c.activity === ACTIVITY_KEY[activity]);
  return idx ? idx.cost_index : null;
}
