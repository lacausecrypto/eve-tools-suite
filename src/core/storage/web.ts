import type { KvStore, SuiteStorage } from "./types";

/** Implémentation `localStorage` (dev web, sans Tauri). Préfixe : `ets:<ns>:`. */
const PREFIX = "ets:";

/**
 * Repli mémoire si `localStorage` est indisponible (env de test node, webview
 * restreinte). Évite un `ReferenceError` non géré qui ferait silencieusement
 * échouer les écritures de stores persistés.
 */
const memStore = new Map<string, string>();
const ls: Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length"> =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem: (k) => (memStore.has(k) ? memStore.get(k)! : null),
        setItem: (k, v) => void memStore.set(k, String(v)),
        removeItem: (k) => void memStore.delete(k),
        key: (i) => [...memStore.keys()][i] ?? null,
        get length() {
          return memStore.size;
        },
      };

function nsPrefix(id: string): string {
  return `${PREFIX}${id}:`;
}

function webKv(id: string): KvStore {
  const p = nsPrefix(id);
  return {
    async get(key) {
      return ls.getItem(p + key);
    },
    async set(key, value) {
      ls.setItem(p + key, value);
    },
    async remove(key) {
      ls.removeItem(p + key);
    },
    async keys() {
      const out: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(p)) out.push(k.slice(p.length));
      }
      return out;
    },
    async clear() {
      const all: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(p)) all.push(k);
      }
      all.forEach((k) => ls.removeItem(k));
    },
  };
}

export function createWebStorage(): SuiteStorage {
  return {
    backend: "web",
    sql: null,
    namespace: webKv,
  };
}
