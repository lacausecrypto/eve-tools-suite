/**
 * Couche réseau de l'Appraiser Abyssal — **ESI publique** uniquement.
 * - Item dynamique (rollé) : `GET /dogma/dynamic/items/{type}/{item}/`.
 * - Attributs de base d'un module : `GET /universe/types/{id}/`.
 * - Noms : `POST /universe/names/`. Prix de référence : pricing partagé (Fuzzwork).
 */
import { esi } from "@/core/esi/client";
import { t } from "@/core/i18n";
import { track } from "@/core/analytics";
import { loadAdjustedPrices, loadJitaQuotes } from "@/core/pricing";
import { thirdPartyGet } from "@/core/http/thirdParty";
import { parseItemRef } from "./lib/parse";
import { scoreRoll } from "./lib/score";
import { MUTAPLASMIDS } from "./data/mutaplasmids";
import type { RollScore } from "./lib/types";

const MUTAMARKET = "https://mutamarket.com/api";

interface DogmaAttr {
  attribute_id: number;
  value: number;
}

/** Estimation de marché MutaMarket (revente par contrat). */
export interface MarketEstimate {
  estimatedValue: number;
  updatedAt: string | null;
  /** Prix d'un contrat live si le module est actuellement en vente. */
  contractPrice: number | null;
  /** Qualité moyenne du roll selon MutaMarket. */
  averageFraction: number | null;
  /** Slug pour le lien vers la fiche MutaMarket. */
  slug: string | null;
}

/** Fiabilité de l'estimateur d'un type (erreur moyenne, échantillon). */
export interface EstimatorStat {
  nmae: number; // erreur absolue moyenne normalisée (%)
  r2: number;
  count: number;
}

interface MmModule {
  estimated_value?: number;
  estimated_value_updated_at?: string;
  contract?: { price?: number } | null;
  average_fraction?: number;
  slug?: string;
  status?: number;
}

function mapEstimate(d: MmModule): MarketEstimate | null {
  if (!d || d.status === 404 || d.estimated_value == null) return null;
  return {
    estimatedValue: Number(d.estimated_value) || 0,
    updatedAt: d.estimated_value_updated_at ?? null,
    contractPrice: d.contract?.price != null ? Number(d.contract.price) : null,
    averageFraction: d.average_fraction != null ? Number(d.average_fraction) : null,
    slug: d.slug ?? null,
  };
}

/**
 * Estimation MutaMarket d'un module via `GET /api/modules/{item_id}`. Disponible
 * pour tout module déjà **vu sur un contrat** (MutaMarket scrape les contrats en
 * continu) ; `null` pour un module jamais contracté (l'appraisal à la demande
 * exige un compte MutaMarket).
 */
export async function fetchMarketEstimate(itemId: number): Promise<MarketEstimate | null> {
  try {
    const { status, body } = await thirdPartyGet(`${MUTAMARKET}/modules/${itemId}`);
    if (status < 200 || status >= 300) return null;
    return mapEstimate(JSON.parse(body) as MmModule);
  } catch {
    return null;
  }
}

let estimatorCache: Map<number, EstimatorStat> | null = null;

/** Statistiques de fiabilité de l'estimateur MutaMarket pour un type. */
export async function estimatorFor(typeId: number): Promise<EstimatorStat | null> {
  if (!estimatorCache) {
    estimatorCache = new Map();
    try {
      const { status, body } = await thirdPartyGet(`${MUTAMARKET}/estimator-statistics`);
      if (status >= 200 && status < 300) {
        const arr = JSON.parse(body) as { type_id: number; nmae: number; r2: number; data_count: number }[];
        for (const e of arr)
          estimatorCache.set(e.type_id, { nmae: Number(e.nmae) || 0, r2: Number(e.r2) || 0, count: Number(e.data_count) || 0 });
      }
    } catch {
      /* indisponible : confiance non affichée */
    }
  }
  return estimatorCache.get(typeId) ?? null;
}

function toMap(attrs?: DogmaAttr[]): Record<number, number> {
  const m: Record<number, number> = {};
  for (const a of attrs ?? []) m[a.attribute_id] = a.value;
  return m;
}

async function fetchTypeAttrs(typeId: number): Promise<Record<number, number>> {
  const res = await esi<{ dogma_attributes?: DogmaAttr[] }>({ path: `/universe/types/${typeId}/` });
  return toMap(res.data.dogma_attributes);
}

async function resolveNames(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!unique.length) return out;
  const res = await esi<{ id: number; name: string }[]>({
    path: "/universe/names/",
    method: "POST",
    body: unique,
  });
  for (const n of res.data) out.set(n.id, n.name);
  return out;
}

// ───────────────────────── Mode « Évaluer un roll » ─────────────────────────

export interface EvalResult {
  score: RollScore;
  resultName: string;
  baseName: string;
  mutatorName: string;
  basePrice: number;
  mutatorPrice: number;
  /** Estimation de revente MutaMarket (null si module non répertorié). */
  market: MarketEstimate | null;
  /** Fiabilité de l'estimateur pour ce type (null si indisponible). */
  estimator: EstimatorStat | null;
  itemId: number;
}

/**
 * Erreur **fonctionnelle** (message déjà localisé, à afficher tel quel à
 * l'utilisateur), par opposition aux erreurs réseau/dev génériques.
 */
export class AbyssalError extends Error {
  readonly userFacing = true;
  constructor(message: string) {
    super(message);
    this.name = "AbyssalError";
  }
}

export async function evaluateLink(text: string): Promise<EvalResult> {
  track("abyssal_evaluated");
  const ref = parseItemRef(text);
  if (!ref) throw new AbyssalError(t("abyssal.error.invalidLink"));

  const res = await esi<{
    source_type_id: number;
    mutator_type_id: number;
    dogma_attributes?: DogmaAttr[];
  }>({ path: `/dogma/dynamic/items/${ref.typeId}/${ref.itemId}/` });

  const rolled = toMap(res.data.dogma_attributes);
  const baseAttrs = await fetchTypeAttrs(res.data.source_type_id);
  const score = scoreRoll(res.data.mutator_type_id, res.data.source_type_id, ref.typeId, baseAttrs, rolled);
  if (!score) throw new AbyssalError(t("abyssal.error.unknownMutaplasmid"));

  // Noms, prix de référence, estimation MutaMarket et fiabilité — en parallèle.
  const [nm, quotes, market, estimator] = await Promise.all([
    resolveNames([ref.typeId, res.data.source_type_id, res.data.mutator_type_id]),
    loadJitaQuotes([res.data.source_type_id, res.data.mutator_type_id]),
    fetchMarketEstimate(ref.itemId),
    estimatorFor(ref.typeId),
  ]);

  return {
    score,
    resultName: nm.get(ref.typeId) ?? `#${ref.typeId}`,
    baseName: nm.get(res.data.source_type_id) ?? `#${res.data.source_type_id}`,
    mutatorName: nm.get(res.data.mutator_type_id) ?? `#${res.data.mutator_type_id}`,
    basePrice: quotes.get(res.data.source_type_id)?.sell ?? 0,
    mutatorPrice: quotes.get(res.data.mutator_type_id)?.sell ?? 0,
    market,
    estimator,
    itemId: ref.itemId,
  };
}

// ───────────────────────── Mode « Explorer les plages » ─────────────────────

/** Un **tier** (mutaplasmide) au sein d'une famille de module. */
export interface Tier {
  id: number;
  name: string;
  tier: string; // libellé court (Decayed, Gravid, Unstable, Glorified…)
  rank: number;
  attrs: Record<number, [number, number]>;
  bases: number[];
}

/** Une **famille** = un module abyssal (type résultat) et ses tiers de mutaplasmides. */
export interface Family {
  resultId: number;
  resultName: string;
  tiers: Tier[];
  /** Modules de base applicables (union des tiers). */
  bases: number[];
}

const BASIC_TIERS = ["Decayed", "Gravid", "Unstable", "Exigent", "Radical"];

function parseTier(name: string): { tier: string; rank: number } {
  const n = name.replace(/\s*Mutaplasmid\s*$/i, "").trim();
  const glorified = /^Glorified\b/i.test(n);
  const base = BASIC_TIERS.find((g) => new RegExp(`(^|\\s)${g}(\\s|$)`, "i").test(n));
  const baseRank = base ? BASIC_TIERS.indexOf(base) + 1 : 9;
  if (glorified && base) return { tier: `Glorified ${base}`, rank: 10 + baseRank };
  if (glorified) return { tier: "Glorified", rank: 19 };
  if (base) return { tier: base, rank: baseRank };
  return { tier: n.split(/\s+/)[0] || name, rank: 9 };
}

let familyCache: Family[] | null = null;

/** Charge les familles (groupées par type résultat), noms résolus une fois. */
export async function loadFamilies(): Promise<Family[]> {
  if (familyCache) return familyCache;
  const mutaIds = Object.keys(MUTAPLASMIDS).map(Number);
  const resultIds = [...new Set(mutaIds.map((id) => MUTAPLASMIDS[id].result))];
  const nm = await resolveNames([...mutaIds, ...resultIds]);

  const byResult = new Map<number, Tier[]>();
  for (const id of mutaIds) {
    const m = MUTAPLASMIDS[id];
    const { tier, rank } = parseTier(nm.get(id) ?? `#${id}`);
    const t: Tier = { id, name: nm.get(id) ?? `#${id}`, tier, rank, attrs: m.attrs, bases: m.bases };
    const arr = byResult.get(m.result) ?? [];
    arr.push(t);
    byResult.set(m.result, arr);
  }

  familyCache = [...byResult.entries()]
    .map(([resultId, tiers]) => {
      tiers.sort((a, b) => a.rank - b.rank);
      const bases = [...new Set(tiers.flatMap((t) => t.bases))];
      return { resultId, resultName: nm.get(resultId) ?? `#${resultId}`, tiers, bases };
    })
    .sort((a, b) => a.resultName.localeCompare(b.resultName));
  return familyCache;
}

/**
 * Coût de chaque mutaplasmide d'une famille (prix Jita). Repli robuste :
 * **vente → achat → prix ajusté (EIV)** pour qu'un coût s'affiche même pour les
 * tiers peu liquides (Glorified, Exigent…).
 */
export async function tierPrices(ids: number[]): Promise<Map<number, number>> {
  const [quotes, adjusted] = await Promise.all([loadJitaQuotes(ids), loadAdjustedPrices()]);
  const out = new Map<number, number>();
  for (const id of ids) {
    const q = quotes.get(id);
    out.set(id, q?.sell || q?.buy || adjusted.get(id) || 0);
  }
  return out;
}

export async function loadBaseNames(ids: number[]): Promise<Map<number, string>> {
  return resolveNames(ids);
}

/** Attributs de base d'un module (pour afficher des valeurs absolues). */
export async function baseAttrsOf(baseTypeId: number): Promise<Record<number, number>> {
  return fetchTypeAttrs(baseTypeId);
}
