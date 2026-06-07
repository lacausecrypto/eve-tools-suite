/**
 * Optimiseur de **remap d'attributs** : trouve la répartition des 14 points
 * (chaque attribut ∈ [17,27], somme 99) qui **minimise le temps total** du plan,
 * implants pris en compte (non remappables).
 *
 * Espace de recherche : compositions de 14 sur 5 attributs, chacune ≤ 10
 * (~3000 combinaisons) — recherche exhaustive, optimum exact et instantané.
 */
import {
  ATTRS,
  ATTR_MAX,
  ATTR_MIN,
  REMAP_POINTS,
  type AttrSet,
} from "./sp";
import { planSeconds } from "./plan";

const CAP = ATTR_MAX - ATTR_MIN; // 10

/** Génère toutes les allocations valides des points répartissables. */
function* allocations(): Generator<number[]> {
  const n = ATTRS.length;
  const a = new Array(n).fill(0);
  function* rec(i: number, rem: number): Generator<number[]> {
    if (i === n - 1) {
      if (rem <= CAP) {
        a[i] = rem;
        yield a.slice();
      }
      return;
    }
    for (let v = 0; v <= Math.min(CAP, rem); v++) {
      a[i] = v;
      yield* rec(i + 1, rem - v);
    }
  }
  yield* rec(0, REMAP_POINTS);
}

function baseFromAlloc(alloc: number[]): AttrSet {
  return {
    int: ATTR_MIN + alloc[0],
    mem: ATTR_MIN + alloc[1],
    per: ATTR_MIN + alloc[2],
    will: ATTR_MIN + alloc[3],
    cha: ATTR_MIN + alloc[4],
  };
}

export interface RemapResult {
  base: AttrSet;
  seconds: number;
}

/** Remap optimal pour un plan (paires de SP), implants et état de clone donnés. */
export function optimizeRemap(
  pairs: Map<string, number>,
  implants: AttrSet,
  alpha: boolean,
): RemapResult {
  let best: RemapResult | null = null;
  for (const alloc of allocations()) {
    const base = baseFromAlloc(alloc);
    const seconds = planSeconds(pairs, base, implants, alpha);
    if (!best || seconds < best.seconds) best = { base, seconds };
  }
  return best ?? { base: baseFromAlloc([3, 3, 3, 3, 2]), seconds: 0 };
}
