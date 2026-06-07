/**
 * Persistance locale partagée de la suite. Chaque module obtient un espace
 * **isolé** (`namespace`) pour éviter toute collision de clés entre outils.
 *
 * Deux implémentations interchangeables :
 * - **SQLite** via Tauri (`tauri-plugin-sql`) en application desktop ;
 * - **localStorage** en dev web (sans backend).
 */
export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/** Accès SQL bas niveau (tables réelles) — disponible uniquement en Tauri. */
export interface SqlAccess {
  execute(query: string, params?: unknown[]): Promise<void>;
  select<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;
}

export interface SuiteStorage {
  /** Espace clé/valeur isolé pour un module (ou le shell). */
  namespace(id: string): KvStore;
  /** Backend actif (diagnostic). */
  backend: "sqlite" | "web";
  /** SQL réel si disponible (Tauri uniquement), sinon `null`. */
  sql: SqlAccess | null;
}
