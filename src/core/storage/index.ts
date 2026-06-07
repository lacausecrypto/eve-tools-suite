import { isTauri } from "@/core/runtime";
import type { KvStore, SuiteStorage } from "./types";
import { createWebStorage } from "./web";
import { createSqliteStorage } from "./sqlite";

export type { KvStore, SuiteStorage, SqlAccess } from "./types";

let instance: SuiteStorage | null = null;

/** Stockage de la suite (singleton) : SQLite en Tauri, localStorage en web. */
export function storage(): SuiteStorage {
  if (!instance) {
    instance = isTauri() ? createSqliteStorage() : createWebStorage();
  }
  return instance;
}

/** Raccourci : espace clé/valeur isolé d'un module (ou du shell). */
export function kv(namespace: string): KvStore {
  return storage().namespace(namespace);
}
