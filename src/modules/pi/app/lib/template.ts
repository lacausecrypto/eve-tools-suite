/**
 * Génération d'un **template Planetary Interaction au format CCP officiel**
 * (importable in-game), pour une configuration d'extraction mono-planète.
 *
 * Format **reverse-engineeré** depuis de vrais templates exportés du jeu
 * (dépôt communautaire DalShooth/EVE_PI_Templates) :
 *
 *  - `Pln`       : type_id de la planète (Barren 2016, Storm 2017, …).
 *  - `CmdCtrLv`  : niveau du Command Center.
 *  - `P` (pins)  : { La, Lo (rad), T = type_id de **structure spécifique à la
 *                   planète** (ex. « Barren Extractor Control Unit »), S = id du
 *                   produit (P0 extrait pour un ECU, P1 produit pour une usine ;
 *                   null pour storage/launchpad), H = têtes d'extracteur }.
 *  - `L` (liens) : { D, S = indices de pins **1-based** reliés, Lv }.
 *  - `R` (routes): { P = chemin d'indices de pins 1-based, Q = quantité,
 *                   T = type_id de la marchandise routée }.
 *
 * Les type_ids (structures par planète + marchandises) sont résolus via le
 * **client ESI** (`/universe/ids/`, mêmes noms qu'in-game) — aucune valeur
 * fabriquée. Topologie en **étoile** autour du launchpad : routes à 2 pins.
 */
import { resolveTypeIds } from "./prices";
import { cyclesForDuration, summarizeProgram } from "./extractor";
import { commodityName, p1FromRaw, PLANETS, type PlanetType } from "../data/commodities";
import type { ExtractionConfig } from "./setup";

/** type_id de la planète (groupe « Planet » de la SDE). */
const PLANET_TYPE_ID: Record<PlanetType, number> = {
  temperate: 11,
  ice: 12,
  gas: 13,
  oceanic: 2014,
  lava: 2015,
  barren: 2016,
  storm: 2017,
  plasma: 2063,
};

interface Pin {
  H: number;
  La: number;
  Lo: number;
  S: number | null;
  T: number;
}
interface Link {
  D: number;
  Lv: number;
  S: number;
}
interface Route {
  P: number[];
  Q: number;
  T: number;
}
export interface CcpTemplate {
  CmdCtrLv: number;
  Cmt: string;
  Diam: number;
  L: Link[];
  P: Pin[];
  Pln: number;
  R: Route[];
}

const r5 = (x: number) => Math.round(x * 100000) / 100000;

/** Construit un template CCP importable à partir d'une config d'extraction. */
export async function buildCcpTemplate(
  c: ExtractionConfig,
  ccLevel = 5,
): Promise<CcpTemplate> {
  const planetLabel = PLANETS.find((p) => p.id === c.planet)?.name ?? "Barren";
  const ecuName = `${planetLabel} Extractor Control Unit`;
  const basicName = `${planetLabel} Basic Industry Facility`;
  const lpName = `${planetLabel} Launchpad`;
  const rawName = commodityName(c.rawId);
  const p1 = p1FromRaw(c.rawId);

  const names = [ecuName, basicName, lpName, rawName];
  if (p1) names.push(p1.name);
  const ids = await resolveTypeIds(names);

  const ecuT = ids.get(ecuName);
  const basicT = ids.get(basicName);
  const lpT = ids.get(lpName);
  const rawT = ids.get(rawName);
  const p1T = p1 ? ids.get(p1.name) : undefined;
  if (!ecuT || !lpT || !rawT)
    throw new Error("type_ids de structures introuvables (ESI)");

  const factories = Math.max(0, Math.floor(c.p1Factories));
  const totalPins = 2 + factories; // launchpad + ECU + usines

  // Positions : cluster angulaire serré autour d'un centre (liens courts).
  const center = { la: 1.2, lo: 1.5 };
  const spread = 0.02;
  const ring = (i: number) => {
    const a = (2 * Math.PI * i) / Math.max(1, totalPins - 1);
    return { la: center.la + spread * Math.cos(a), lo: center.lo + spread * Math.sin(a) };
  };

  const P: Pin[] = [];
  // Pin 1 : launchpad (hub).
  P.push({ H: 0, La: r5(center.la), Lo: r5(center.lo), S: null, T: lpT });
  // Pin 2 : ECU (S = P0 extrait, H = têtes).
  const e = ring(1);
  P.push({ H: c.heads, La: r5(e.la), Lo: r5(e.lo), S: rawT, T: ecuT });
  // Pins 3.. : usines Basic (S = P1 produit).
  for (let f = 0; f < factories; f++) {
    const p = ring(2 + f);
    P.push({
      H: 0,
      La: r5(p.la),
      Lo: r5(p.lo),
      S: p1T ?? null,
      T: basicT ?? lpT,
    });
  }

  // Liens en étoile : chaque pin relié au launchpad (pin 1).
  const L: Link[] = [];
  for (let idx = 2; idx <= totalPins; idx++) L.push({ D: idx, Lv: 0, S: 1 });

  // Routes : ECU→hub (raw), puis hub→usine (raw 3000) et usine→hub (P1 20).
  const totalCycles = cyclesForDuration(c.cycleSec, c.durationHours || 1);
  const prog = summarizeProgram(c.qtyPerCycle || 0, c.cycleSec, totalCycles, c.heads);
  const R: Route[] = [{ P: [2, 1], Q: Math.max(1, Math.round(prog.total)), T: rawT }];
  if (basicT && p1T) {
    for (let f = 0; f < factories; f++) {
      const pin = 3 + f;
      R.push({ P: [1, pin], Q: 3000, T: rawT });
      R.push({ P: [pin, 1], Q: 20, T: p1T });
    }
  }

  return {
    CmdCtrLv: ccLevel,
    Cmt: `${planetLabel} – ${rawName}${p1 ? ` → ${p1.name}` : ""} (EVE PI Sim)`,
    Diam: 10000.0,
    L,
    P,
    Pln: PLANET_TYPE_ID[c.planet],
    R,
  };
}
