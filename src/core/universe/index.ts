/**
 * Service **Univers / SDE** partagé — résolution des `id` EVE (types, systèmes,
 * régions, personnages, corpos, alliances…) vers leurs noms, mutualisée entre
 * les modules.
 *
 * Source : ESI publique `POST /universe/names/` (jusqu'à 1000 ids par appel).
 * Cache à deux niveaux : mémoire (session) + persistant (namespace `universe`),
 * car ces correspondances id→nom sont stables (données SDE).
 */
import { esiPost } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { logger } from "@/core/log";

const log = logger("universe");
const store = kv("universe");

export type NameCategory =
  | "alliance"
  | "character"
  | "constellation"
  | "corporation"
  | "faction"
  | "inventory_type"
  | "region"
  | "solar_system"
  | "station";

export interface ResolvedName {
  id: number;
  name: string;
  category: NameCategory | string;
}

interface EsiNameEntry {
  id: number;
  name: string;
  category: string;
}

const memory = new Map<number, ResolvedName>();
const ESI_NAMES_BATCH = 1000;

const keyOf = (id: number) => `n:${id}`;

/** Lit le cache persistant pour un id (puis le promeut en mémoire). */
async function loadPersisted(id: number): Promise<ResolvedName | null> {
  try {
    const raw = await store.get(keyOf(id));
    if (!raw) return null;
    const v = JSON.parse(raw) as ResolvedName;
    memory.set(id, v);
    return v;
  } catch {
    return null;
  }
}

function persist(entry: ResolvedName): void {
  memory.set(entry.id, entry);
  // Écriture best-effort (ne bloque pas la résolution).
  void store.set(keyOf(entry.id), JSON.stringify(entry)).catch(() => {});
}

/**
 * Résout un lot d'ids en noms (dédupliqué, caché). Les ids inconnus de l'ESI
 * sont simplement absents de la map renvoyée.
 */
export async function resolveNames(
  ids: number[],
): Promise<Map<number, ResolvedName>> {
  const out = new Map<number, ResolvedName>();
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];

  const missing: number[] = [];
  for (const id of unique) {
    const mem = memory.get(id);
    if (mem) {
      out.set(id, mem);
      continue;
    }
    const persisted = await loadPersisted(id);
    if (persisted) out.set(id, persisted);
    else missing.push(id);
  }

  for (let i = 0; i < missing.length; i += ESI_NAMES_BATCH) {
    const batch = missing.slice(i, i + ESI_NAMES_BATCH);
    try {
      const entries = await esiPost<EsiNameEntry[]>("/universe/names/", batch);
      for (const e of entries) {
        const resolved: ResolvedName = {
          id: e.id,
          name: e.name,
          category: e.category,
        };
        persist(resolved);
        out.set(e.id, resolved);
      }
    } catch (err) {
      // Un lot contenant un id invalide fait échouer tout le lot côté ESI ;
      // on journalise et on continue (les autres lots restent résolus).
      log.warn("resolveNames batch failed", err);
    }
  }

  return out;
}

/** Résout un seul id en nom (ou `null` si inconnu). */
export async function resolveName(id: number): Promise<ResolvedName | null> {
  const map = await resolveNames([id]);
  return map.get(id) ?? null;
}

/** Nom d'un id, avec repli sur `#<id>` si non résolu. */
export async function nameOf(id: number): Promise<string> {
  return (await resolveName(id))?.name ?? `#${id}`;
}

/** Vide le cache mémoire (le cache persistant reste). */
export function clearUniverseMemory(): void {
  memory.clear();
}
