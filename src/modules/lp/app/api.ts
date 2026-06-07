/**
 * Couche réseau du Convertisseur LP — **ESI publique** + Fuzzwork (tiers).
 * - Offres d'un LP store : `GET /loyalty/stores/{corp}/offers/` (public).
 * - Noms : `POST /universe/names/`. Prix + volume : Fuzzwork agrégats (Jita).
 */
import { esi } from "@/core/esi/client";
import { thirdPartyJson } from "@/core/http/thirdParty";
import { track } from "@/core/analytics";
import { priceOffers, type FeeConfig, type OutBasis, type PricedOffer, type Quote, type RawOffer } from "./lib/compute";

const FUZZWORK_AGG = "https://market.fuzzwork.co.uk/aggregates/";
const JITA_4_4 = 60003760;

interface OfferESI {
  offer_id: number;
  type_id: number;
  quantity: number;
  lp_cost: number;
  isk_cost: number;
  required_items?: { type_id: number; quantity: number }[];
}

async function fetchOffers(corpId: number): Promise<RawOffer[]> {
  const res = await esi<OfferESI[]>({ path: `/loyalty/stores/${corpId}/offers/` });
  return (res.data ?? []).map((o) => ({
    offerId: o.offer_id,
    typeId: o.type_id,
    quantity: o.quantity,
    lpCost: o.lp_cost,
    iskCost: o.isk_cost,
    requiredItems: (o.required_items ?? []).map((r) => ({ typeId: r.type_id, quantity: r.quantity })),
  }));
}

async function resolveNames(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const unique = [...new Set(ids)].filter((n) => n > 0);
  for (let i = 0; i < unique.length; i += 1000) {
    try {
      const res = await esi<{ id: number; name: string }[]>({
        path: "/universe/names/",
        method: "POST",
        body: unique.slice(i, i + 1000),
      });
      for (const n of res.data) out.set(n.id, n.name);
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}

interface FuzzAgg {
  buy?: { max?: string };
  sell?: { min?: string; volume?: string };
}

/** Cotations Jita (achat/vente + volume de vente) via Fuzzwork. */
async function loadQuotes(ids: number[]): Promise<Map<number, Quote>> {
  const out = new Map<number, Quote>();
  const unique = [...new Set(ids)].filter((n) => n > 0);
  for (let i = 0; i < unique.length; i += 100) {
    const part = unique.slice(i, i + 100);
    try {
      const data = await thirdPartyJson<Record<string, FuzzAgg>>(
        `${FUZZWORK_AGG}?station=${JITA_4_4}&types=${part.join(",")}`,
      );
      for (const [id, row] of Object.entries(data)) {
        out.set(Number(id), {
          buy: Number(row.buy?.max) || 0,
          sell: Number(row.sell?.min) || 0,
          sellVolume: Number(row.sell?.volume) || 0,
        });
      }
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}

export interface LpResult {
  offers: PricedOffer[];
  /** Nombre d'offres dont le prix de revente est inconnu (ignorées du tri utile). */
  unpriced: number;
}

/** Charge et valorise toutes les offres d'un LP store. */
export async function loadLpStore(corpId: number, outBasis: OutBasis, fees: FeeConfig): Promise<LpResult> {
  track("lp_store_computed", { basis: outBasis });
  const offers = await fetchOffers(corpId);
  if (!offers.length) return { offers: [], unpriced: 0 };

  const ids = new Set<number>();
  for (const o of offers) {
    ids.add(o.typeId);
    for (const r of o.requiredItems) ids.add(r.typeId);
  }
  const [names, quotes] = await Promise.all([resolveNames([...ids]), loadQuotes([...ids])]);

  const priced = priceOffers(offers, quotes, names, outBasis, fees);
  const unpriced = priced.filter((o) => o.outUnit <= 0).length;
  return { offers: priced, unpriced };
}
