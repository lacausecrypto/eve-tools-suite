import type { KvStore, SqlAccess, SuiteStorage } from "./types";

/**
 * Implémentation **SQLite** via `tauri-plugin-sql` (application desktop).
 * Une seule base `eve-tools.db` ; les modules sont isolés par la colonne `ns`
 * d'une table clé/valeur. L'accès SQL réel est aussi exposé pour les modules
 * qui veulent leurs propres tables.
 */
const DB_URL = "sqlite:eve-tools.db";

// Type minimal du handle renvoyé par @tauri-apps/plugin-sql.
interface TauriDb {
  execute(query: string, bind?: unknown[]): Promise<unknown>;
  select<T>(query: string, bind?: unknown[]): Promise<T[]>;
}

let dbPromise: Promise<TauriDb> | null = null;

async function getDb(): Promise<TauriDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const mod = await import("@tauri-apps/plugin-sql");
      const Database = mod.default;
      const db = (await Database.load(DB_URL)) as unknown as TauriDb;
      await db.execute(
        "CREATE TABLE IF NOT EXISTS kv (ns TEXT NOT NULL, k TEXT NOT NULL, v TEXT, PRIMARY KEY (ns, k))"
      );
      return db;
    })();
  }
  return dbPromise;
}

function sqliteKv(id: string): KvStore {
  return {
    async get(key) {
      const db = await getDb();
      const rows = await db.select<{ v: string }>(
        "SELECT v FROM kv WHERE ns = $1 AND k = $2",
        [id, key]
      );
      return rows.length ? rows[0].v : null;
    },
    async set(key, value) {
      const db = await getDb();
      await db.execute(
        "INSERT INTO kv (ns, k, v) VALUES ($1, $2, $3) ON CONFLICT(ns, k) DO UPDATE SET v = excluded.v",
        [id, key, value]
      );
    },
    async remove(key) {
      const db = await getDb();
      await db.execute("DELETE FROM kv WHERE ns = $1 AND k = $2", [id, key]);
    },
    async keys() {
      const db = await getDb();
      const rows = await db.select<{ k: string }>(
        "SELECT k FROM kv WHERE ns = $1",
        [id]
      );
      return rows.map((r) => r.k);
    },
    async clear() {
      const db = await getDb();
      await db.execute("DELETE FROM kv WHERE ns = $1", [id]);
    },
  };
}

export function createSqliteStorage(): SuiteStorage {
  const sql: SqlAccess = {
    async execute(query, params) {
      const db = await getDb();
      await db.execute(query, params);
    },
    async select<T>(query: string, params?: unknown[]) {
      const db = await getDb();
      return db.select<T>(query, params);
    },
  };
  return { backend: "sqlite", sql, namespace: sqliteKv };
}
