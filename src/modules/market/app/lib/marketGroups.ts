/**
 * Arbre **complet** des groupes de marché EVE, via ESI public
 * (`/markets/groups/` + `/markets/groups/{id}/`). Reproduit exactement la fenêtre
 * Marché du jeu (tous les objets échangeables), sans embarquer le SDE.
 *
 * Les données de groupe sont **statiques** (SDE) : on les met en cache de façon
 * **persistante** (namespace `market-tree`), si bien que la construction n'a lieu
 * qu'une fois ; ensuite l'arbre se charge depuis le cache local.
 */
import { esiGet } from "@/core/esi/client";
import { kv } from "@/core/storage";

const store = kv("market-tree");
const memGroups = new Map<number, MarketGroup>();
let idsCache: number[] | null = null;

/** Groupe de marché normalisé. */
export interface MarketGroup {
  id: number;
  name: string;
  parent: number | null;
  /** type_ids listés directement dans ce groupe (feuilles). */
  types: number[];
}

/** Nœud d'arbre (groupe + sous-groupes + types). */
export interface TreeNode {
  id: number;
  name: string;
  parent: number | null;
  children: TreeNode[];
  types: number[];
}

interface RawGroup {
  market_group_id: number;
  name: string;
  parent_group_id?: number;
  types?: number[];
}

/** Liste de tous les ids de groupes (cachée). */
async function loadIds(): Promise<number[]> {
  if (idsCache) return idsCache;
  const cached = await store.get("ids").catch(() => null);
  if (cached) {
    try {
      idsCache = JSON.parse(cached) as number[];
      return idsCache;
    } catch {
      /* re-fetch */
    }
  }
  const ids = await esiGet<number[]>("/markets/groups/");
  idsCache = ids;
  void store.set("ids", JSON.stringify(ids)).catch(() => {});
  return ids;
}

/** Détail d'un groupe (mémoire → cache persistant → ESI). */
async function loadGroup(id: number): Promise<MarketGroup | null> {
  const mem = memGroups.get(id);
  if (mem) return mem;
  const cached = await store.get(`g:${id}`).catch(() => null);
  if (cached) {
    try {
      const g = JSON.parse(cached) as MarketGroup;
      memGroups.set(id, g);
      return g;
    } catch {
      /* re-fetch */
    }
  }
  try {
    const raw = await esiGet<RawGroup>(`/markets/groups/${id}/`);
    const g: MarketGroup = {
      id: raw.market_group_id,
      name: raw.name,
      parent: raw.parent_group_id ?? null,
      types: raw.types ?? [],
    };
    memGroups.set(id, g);
    void store.set(`g:${id}`, JSON.stringify(g)).catch(() => {});
    return g;
  } catch {
    return null;
  }
}

/**
 * Construit l'arbre complet. Récupère tous les groupes (concurrence limitée,
 * cachés), puis relie parents/enfants. `onProgress(done, total)` permet
 * d'afficher une barre de progression au premier chargement.
 */
export async function buildMarketTree(
  onProgress?: (done: number, total: number) => void,
): Promise<TreeNode[]> {
  const ids = await loadIds();
  const total = ids.length;
  const groups: MarketGroup[] = [];
  let done = 0;
  let cursor = 0;
  const CONCURRENCY = 12;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const g = await loadGroup(id);
      if (g) groups.push(g);
      done += 1;
      onProgress?.(done, total);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  const byId = new Map<number, TreeNode>();
  for (const g of groups) {
    byId.set(g.id, { id: g.id, name: g.name, parent: g.parent, children: [], types: g.types });
  }
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent != null ? byId.get(node.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Filtre l'arbre par sous-chaîne de nom de groupe (garde les branches utiles). */
export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const walk = (node: TreeNode): TreeNode | null => {
    const children = node.children.map(walk).filter((n): n is TreeNode => n != null);
    if (node.name.toLowerCase().includes(q) || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };
  return nodes.map(walk).filter((n): n is TreeNode => n != null);
}
