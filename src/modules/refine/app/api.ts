/**
 * Couche réseau de Reprocessing & Compression — **Fuzzwork** (prix Jita) pour
 * valoriser minerais et minéraux. Pas d'ESI privée : tout le reste est en bundle
 * (compositions de reprocessing) ou calculé localement.
 */

import { thirdPartyJson } from "@/core/http/thirdParty";

const FUZZWORK_AGG = "https://market.fuzzwork.co.uk/aggregates/";
const JITA_4_4 = 60003760;

export interface Quote {
  buy: number;
  sell: number;
}

interface FuzzAgg {
  buy?: { max?: string };
  sell?: { min?: string };
}

const cache = new Map<number, Quote>();

/** Cotations Jita (achat/vente) pour des type_id, via Fuzzwork (caché). */
export async function loadQuotes(ids: number[]): Promise<Map<number, Quote>> {
  const out = new Map<number, Quote>();
  const todo: number[] = [];
  for (const id of ids) {
    const c = cache.get(id);
    if (c) out.set(id, c);
    else if (Number.isFinite(id) && id > 0) todo.push(id);
  }
  for (let i = 0; i < todo.length; i += 100) {
    const part = todo.slice(i, i + 100);
    try {
      const data = await thirdPartyJson<Record<string, FuzzAgg>>(
        `${FUZZWORK_AGG}?station=${JITA_4_4}&types=${part.join(",")}`,
      );
      for (const [id, row] of Object.entries(data)) {
        const q: Quote = { buy: Number(row.buy?.max) || 0, sell: Number(row.sell?.min) || 0 };
        cache.set(Number(id), q);
        out.set(Number(id), q);
      }
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}
