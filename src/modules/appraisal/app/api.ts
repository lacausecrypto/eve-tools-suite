/**
 * Couche réseau de l'Appraisal — **ESI publique** + Fuzzwork (tiers).
 * Réutilise le service de pricing partagé (résolution, EIV, carnets VWAP) et
 * ajoute la valorisation **multi-hub** (Fuzzwork agrégats par station) et le
 * volume packagé (ESI `/universe/types/`, caché).
 */
import { esi } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { effectivePrice, loadAdjustedPrices, loadJitaBooks, resolveTypeIds } from "@/core/pricing";
import { thirdPartyJson } from "@/core/http/thirdParty";
import { track } from "@/core/analytics";
import { distinctNames, parseItems } from "./lib/parse";
import type { ResolvedItem } from "./lib/compute";

/** Hubs majeurs (station Fuzzwork). */
export interface Hub {
  id: string;
  label: string;
  station: number;
}
export const HUBS: Hub[] = [
  { id: "jita", label: "Jita (Forge)", station: 60003760 },
  { id: "amarr", label: "Amarr (Domain)", station: 60008494 },
  { id: "dodixie", label: "Dodixie (Sinq)", station: 60011866 },
  { id: "rens", label: "Rens (Heimatar)", station: 60004588 },
  { id: "hek", label: "Hek (Metropolis)", station: 60005686 },
];
export const hubById = (id: string): Hub => HUBS.find((h) => h.id === id) ?? HUBS[0];

const FUZZWORK_AGG = "https://market.fuzzwork.co.uk/aggregates/";

interface Quote {
  buy: number;
  sell: number;
}
interface FuzzAgg {
  buy?: { max?: string };
  sell?: { min?: string };
}

const quoteCache = new Map<string, Quote>();

/** Cotations Fuzzwork (meilleur achat/vente) pour un hub donné. */
async function loadHubQuotes(station: number, ids: number[]): Promise<Map<number, Quote>> {
  const out = new Map<number, Quote>();
  const todo: number[] = [];
  for (const id of ids) {
    const c = quoteCache.get(`${station}:${id}`);
    if (c) out.set(id, c);
    else if (Number.isFinite(id) && id > 0) todo.push(id);
  }
  for (let i = 0; i < todo.length; i += 100) {
    const part = todo.slice(i, i + 100);
    try {
      const data = await thirdPartyJson<Record<string, FuzzAgg>>(
        `${FUZZWORK_AGG}?station=${station}&types=${part.join(",")}`,
      );
      for (const [id, row] of Object.entries(data)) {
        const q: Quote = { buy: Number(row.buy?.max) || 0, sell: Number(row.sell?.min) || 0 };
        quoteCache.set(`${station}:${id}`, q);
        out.set(Number(id), q);
      }
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}

/** VWAP par profondeur du carnet **Jita** (réaliste pour gros volumes). */
async function vwapQuotes(want: Map<number, number>): Promise<Map<number, Quote>> {
  const books = await loadJitaBooks([...want.keys()]);
  const out = new Map<number, Quote>();
  for (const [id, qty] of want) {
    const b = books.get(id);
    out.set(id, { buy: b ? effectivePrice(b.buy, qty) : 0, sell: b ? effectivePrice(b.sell, qty) : 0 });
  }
  return out;
}

// ───────────────────────── Volume packagé (ESI, caché) ──────────────────────

const volStore = kv("appraisal-vol");
const volMem = new Map<number, number>();

async function getVolumes(ids: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const todo: number[] = [];
  for (const id of ids) {
    if (volMem.has(id)) {
      out.set(id, volMem.get(id)!);
      continue;
    }
    const cached = await volStore.get(`v:${id}`);
    if (cached != null) {
      const v = Number(cached);
      volMem.set(id, v);
      out.set(id, v);
    } else todo.push(id);
  }
  const queue = [...todo];
  async function worker() {
    for (;;) {
      const id = queue.shift();
      if (id == null) return;
      try {
        const res = await esi<{ volume?: number; packaged_volume?: number }>({ path: `/universe/types/${id}/` });
        const v = res.data.packaged_volume ?? res.data.volume ?? 0;
        volMem.set(id, v);
        out.set(id, v);
        await volStore.set(`v:${id}`, String(v));
      } catch {
        out.set(id, 0);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, queue.length) }, worker));
  return out;
}

// ───────────────────────── Appraisal (tous les hubs) ────────────────────────

/** Cotations d'un hub indexées par type_id (objet pur, testable). */
export type HubQuotes = Record<number, Quote>;

export interface AppraisalResult {
  /** Items résolus (parts indépendantes du hub : volume, EIV). */
  items: ResolvedItem[];
  unresolved: string[];
  /** Cotations par hub : `quotes[hubId][typeId]`. */
  quotes: Record<string, HubQuotes>;
}

const mapToObj = (m: Map<number, Quote>): HubQuotes => Object.fromEntries(m);

/** Valorise un collage sur **tous les hubs** (résolution + EIV + volume une fois). */
export async function appraise(text: string, vwap: boolean): Promise<AppraisalResult> {
  const parsed = parseItems(text);
  if (!parsed.length) return { items: [], unresolved: [], quotes: {} };
  track("appraisal_run", { vwap, items: parsed.length });

  const names = distinctNames(parsed);
  const idMap = await resolveTypeIds(names);
  const unresolved = names.filter((n) => !idMap.has(n.toLowerCase()));

  const byId = new Map<number, { name: string; qty: number }>();
  for (const l of parsed) {
    const e = idMap.get(l.name.toLowerCase());
    if (!e) continue;
    const cur = byId.get(e.id);
    if (cur) cur.qty += l.qty;
    else byId.set(e.id, { name: e.name, qty: l.qty });
  }
  const ids = [...byId.keys()];
  const qtyMap = new Map([...byId.entries()].map(([id, v]) => [id, v.qty]));

  // Parts indépendantes du hub + cotations des 5 hubs, en parallèle.
  const [adjusted, volumes, ...hubQuotes] = await Promise.all([
    loadAdjustedPrices(),
    getVolumes(ids),
    ...HUBS.map(async (h) =>
      vwap && h.id === "jita" ? mapToObj(await vwapQuotes(qtyMap)) : mapToObj(await loadHubQuotes(h.station, ids)),
    ),
  ]);

  const items: ResolvedItem[] = [...byId.entries()].map(([id, { name, qty }]) => ({
    typeId: id,
    name,
    qty,
    eiv: adjusted.get(id) ?? 0,
    volume: volumes.get(id) ?? 0,
  }));

  const quotes: Record<string, HubQuotes> = {};
  HUBS.forEach((h, i) => (quotes[h.id] = hubQuotes[i]));

  return { items, unresolved, quotes };
}
