/**
 * Valorisation du butin via le **service de pricing partagé** (VWAP/Fuzzwork) :
 * résout les noms → type_id puis récupère les cotations Jita (achat & vente).
 * 100 % ESI publique + Fuzzwork (tiers).
 */
import { loadJitaQuotes, resolveTypeIds } from "@/core/pricing";
import { track } from "@/core/analytics";
import { parseLoot } from "./lib/parse";
import { mergeLoot } from "./lib/compute";
import type { LootLine } from "./lib/types";

export interface ValueResult {
  loot: LootLine[];
  unresolved: string[];
}

/** Parse un collage de butin et le valorise (prix Jita achat/vente mémorisés). */
export async function valueLoot(text: string): Promise<ValueResult> {
  const lines = parseLoot(text);
  if (!lines.length) return { loot: [], unresolved: [] };
  track("activity_loot_valued", { lines: lines.length });

  const names = [...new Set(lines.map((l) => l.name))];
  const idMap = await resolveTypeIds(names);

  const idByName = new Map<string, { id: number; name: string }>();
  const unresolved: string[] = [];
  for (const n of names) {
    const e = idMap.get(n.toLowerCase());
    if (e) idByName.set(n, e);
    else unresolved.push(n);
  }

  const ids = [...new Set([...idByName.values()].map((e) => e.id))];
  const quotes = await loadJitaQuotes(ids);

  let loot: LootLine[] = [];
  for (const l of lines) {
    const e = idByName.get(l.name);
    if (!e) continue;
    const q = quotes.get(e.id) ?? { buy: 0, sell: 0 };
    loot = mergeLoot(loot, [{ typeId: e.id, name: e.name, qty: l.qty, unitBuy: q.buy, unitSell: q.sell }]);
  }
  return { loot, unresolved };
}
