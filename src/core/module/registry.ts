import type { ToolModule } from "./types";

/**
 * Registre des modules-outils. Source unique de vérité du shell : le lanceur et
 * le routeur lisent ce registre. Un module s'ajoute en l'enregistrant ici (voir
 * `src/modules/index.ts`) — aucune autre partie du shell n'a besoin d'évoluer.
 */
const modules = new Map<string, ToolModule>();

export function registerModule(mod: ToolModule): void {
  if (modules.has(mod.id)) {
    console.warn(`[registry] module "${mod.id}" déjà enregistré — ignoré.`);
    return;
  }
  modules.set(mod.id, mod);
}

export function registerModules(mods: ToolModule[]): void {
  mods.forEach(registerModule);
}

export function listModules(): ToolModule[] {
  return [...modules.values()];
}

export function getModule(id: string): ToolModule | undefined {
  return modules.get(id);
}

/**
 * Union dédupliquée et triée de **tous** les scopes ESI déclarés par les modules
 * enregistrés. Source de vérité pour le login SSO : un seul consentement accorde
 * exactement ce dont l'ensemble des outils a besoin — ni plus (moindre privilège
 * CCP), ni moins (pas de 403 « missing scope »). Ne peut pas diverger des outils.
 */
export function requiredScopes(): string[] {
  const set = new Set<string>();
  for (const mod of modules.values())
    for (const scope of mod.esi.scopes ?? []) set.add(scope);
  return [...set].sort();
}
