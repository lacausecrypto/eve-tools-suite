import type { StateStorage } from "zustand/middleware";
import { kv } from "./index";

/**
 * Adapte un espace clé/valeur de la suite au format `StateStorage` attendu par
 * le middleware `persist` de Zustand (async). Permet à n'importe quel module de
 * persister son store dans la base partagée, isolé par son namespace.
 *
 * Usage :
 *   persist(creator, {
 *     name: "state",
 *     storage: createJSONStorage(() => namespacedStorage("mining")),
 *   })
 */
export function namespacedStorage(namespace: string): StateStorage {
  const store = kv(namespace);
  return {
    getItem: (name) => store.get(name),
    setItem: (name, value) => store.set(name, value),
    removeItem: (name) => store.remove(name),
  };
}
