/**
 * Couche réseau de l'Atelier de Fit — **ESI publique** uniquement.
 * - Résolution noms → ids : `POST /universe/ids/`.
 * - Attributs dogma d'un type : `GET /universe/types/{id}/`.
 * Les types sont mis en cache persistant (`kv`) : leurs attributs ne changent
 * qu'aux mises à jour du jeu, inutile de retaper l'ESI à chaque analyse.
 */
import { esi } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { t } from "@/core/i18n";
import { track } from "@/core/analytics";
import { parseEft, typeNames } from "./lib/eft";
import { analyzeFit, placeItems } from "./lib/analyze";
import { hullBonusFor } from "./lib/bonuses";
import { assembleEft, buildLoadout, hullKind, type GenNeed, type Loadout } from "./lib/generate";
import { ARMOR, FIT_LOW, FIT_RIG, SHIELD } from "./data/catalog";
import { ATTR } from "./lib/attrs";
import type { AnalyzeOptions, EsiType, FitAnalysis } from "./lib/types";

const store = kv("atelier-types");

interface EsiIdsResponse {
  inventory_types?: { id: number; name: string }[];
}

interface EsiTypeResponse {
  type_id: number;
  name: string;
  group_id: number;
  dogma_attributes?: { attribute_id: number; value: number }[];
  dogma_effects?: { effect_id: number; is_default: boolean }[];
}

/** Résout une liste de noms en ids EVE (clé = nom en minuscules). */
export async function resolveNames(names: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  // L'ESI limite à 1000 noms par requête.
  for (let i = 0; i < names.length; i += 1000) {
    const batch = names.slice(i, i + 1000);
    const res = await esi<EsiIdsResponse>({ path: "/universe/ids/", method: "POST", body: batch });
    for (const t of res.data.inventory_types ?? []) {
      out.set(t.name.toLowerCase(), t.id);
    }
  }
  return out;
}

/** Récupère un type (attributs + effets dogma), avec cache persistant. */
export async function getType(id: number): Promise<EsiType> {
  const cached = await store.get(`t:${id}`);
  if (cached) {
    try {
      return JSON.parse(cached) as EsiType;
    } catch {
      /* cache corrompu : on refait l'appel */
    }
  }
  const res = await esi<EsiTypeResponse>({ path: `/universe/types/${id}/` });
  const attrs: Record<number, number> = {};
  for (const da of res.data.dogma_attributes ?? []) attrs[da.attribute_id] = da.value;
  const type: EsiType = {
    id: res.data.type_id,
    name: res.data.name,
    groupId: res.data.group_id,
    attrs,
    effects: (res.data.dogma_effects ?? []).map((e) => e.effect_id),
  };
  await store.set(`t:${id}`, JSON.stringify(type));
  return type;
}

/** Récupère plusieurs types en parallèle (concurrence bornée). */
export async function getTypes(ids: number[], concurrency = 6): Promise<Map<number, EsiType>> {
  const out = new Map<number, EsiType>();
  const queue = [...new Set(ids)];
  async function worker() {
    for (;;) {
      const id = queue.shift();
      if (id == null) return;
      try {
        out.set(id, await getType(id));
      } catch {
        /* type introuvable : ignoré, signalé en amont par l'absence */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

/** Résultat d'une analyse complète : fit analysé + noms non résolus. */
export interface LoadResult {
  analysis: FitAnalysis;
  unresolved: string[];
}

/**
 * Pipeline complet : parse EFT → résout les ids → charge les types → place les
 * modules → analyse. Lève si l'en-tête EFT est invalide ou la vaisseau introuvable.
 */
export async function loadFit(text: string, opts: AnalyzeOptions): Promise<LoadResult> {
  track("fit_analyzed");
  const fit = parseEft(text);
  if (!fit) throw new Error(t("atelier.err.eftFormat"));

  const names = typeNames(fit);
  const ids = await resolveNames(names);
  const unresolved = names.filter((n) => !ids.has(n.toLowerCase()));

  const types = await getTypes([...ids.values()]);
  const byName = new Map<string, EsiType>();
  for (const [name, id] of ids) {
    const t = types.get(id);
    if (t) byName.set(name, t);
  }

  const ship = byName.get(fit.shipName.toLowerCase());
  if (!ship) throw new Error(t("atelier.err.hullNotFound", { name: fit.shipName }));

  const items = placeItems(byName, fit.lines);
  // Bonus de vaisseau appliqués au niveau V (cohérent avec l'option PV niveau V).
  const hullBonus = opts.allFiveHp ? hullBonusFor(ship.name) : null;
  const analysis = analyzeFit(ship, fit.fitName, items, { ...opts, hullBonus });
  return { analysis, unresolved };
}

// ─────────────────────── Générateur de fit ───────────────────────

/** Résultat d'une génération : EFT produit, analyse, loadout, corrections. */
export interface GenerateResult extends LoadResult {
  eft: string;
  loadout: Loadout;
  mitigations: string[];
}

const TANK_RIGS = new Set([
  ...Object.values(ARMOR.hpRig),
  ...Object.values(SHIELD.hpRig),
]);
const PLATES = Object.values(ARMOR.plate);
const PLATES_META = ARMOR.plateMeta;
const PROTECTED_LOW = new Set([ARMOR.dcu, ARMOR.resist, FIT_LOW.pg, FIT_LOW.cpu, ...PLATES, ...Object.values(PLATES_META)]);

/** Remplace le premier rig de tank par un rig d'encombrement donné. */
function swapTankRig(lo: Loadout, to: string): boolean {
  const i = lo.rigs.findIndex((r) => TANK_RIGS.has(r));
  if (i < 0 || lo.rigs[i] === to) return false;
  lo.rigs[i] = to;
  return true;
}

/** Allège la plaque (T2 → meta restreinte, moins gourmande en grille). */
function lightenPlate(lo: Loadout): boolean {
  for (let i = 0; i < lo.lows.length; i++) {
    const idx = PLATES.indexOf(lo.lows[i]);
    if (idx >= 0) {
      lo.lows[i] = PLATES_META[(["S", "M", "L"] as const)[idx]];
      return true;
    }
  }
  return false;
}

/** Remplace un module de dégâts (slot bas) par un module d'aide à l'encombrement. */
function swapDamageLow(lo: Loadout, to: string): boolean {
  if (lo.lows.includes(to)) return false;
  for (let i = lo.lows.length - 1; i >= 0; i--) {
    if (!PROTECTED_LOW.has(lo.lows[i])) {
      lo.lows[i] = to;
      return true;
    }
  }
  return false;
}

/**
 * Génère un fit pour un besoin donné : compose le loadout, l'analyse, puis
 * corrige les dépassements CPU/grille jusqu'à le rendre montable (ou au mieux).
 */
export async function generateFit(need: GenNeed, opts: AnalyzeOptions): Promise<GenerateResult> {
  track("fit_generated", { role: need.role, weapon: need.weapon, tank: need.tank, range: need.range });
  const ids = await resolveNames([need.hull]);
  const hullId = ids.get(need.hull.toLowerCase());
  if (hullId == null) throw new Error(t("atelier.err.hullNotFound", { name: need.hull }));
  const hull = await getType(hullId);
  if (!hull.attrs[ATTR.hiSlots] && !hull.attrs[ATTR.medSlots] && !hull.attrs[ATTR.lowSlots])
    throw new Error(t("atelier.err.notAHull", { name: hull.name }));

  const kind = hullKind(hull);
  if (kind === "unsupported")
    throw new Error(t("atelier.err.unsupported", { name: hull.name }));

  const lo = buildLoadout(need, hull);
  const fitName =
    kind === "mining"
      ? t("atelier.fit.mining")
      : kind === "industrial"
        ? t("atelier.fit.industrial")
        : t("atelier.fit.role", { role: t("atelier.role." + need.role) });

  // Un fit généré est calibré pour un pilote **niveau V** (compétences de
  // fitting) : on évalue toujours la faisabilité sous cette hypothèse.
  const genOpts = { ...opts, allFiveHp: true };

  let eft = assembleEft(hull.name, fitName, lo);
  let result = await loadFit(eft, genOpts);
  const mitigations: string[] = [];

  for (let step = 0; step < 8 && result.analysis.fitting.overflow; step++) {
    const f = result.analysis.fitting;
    let changed = false;
    if (f.pg.used > f.pg.total + 0.01) {
      // Réduire l'usage (gratuit) avant d'ajouter de la sortie. Les modules bas
      // (RCU) sont préférés aux rigs ACR qui coûtent ~300 de calibration.
      if (lightenPlate(lo)) {
        mitigations.push(t("atelier.mitig.lightenPlate"));
        changed = true;
      } else if (swapDamageLow(lo, FIT_LOW.pg)) {
        mitigations.push(t("atelier.mitig.rcu"));
        changed = true;
      } else if (swapTankRig(lo, FIT_RIG.pg[lo.size])) {
        mitigations.push(t("atelier.mitig.pgRig"));
        changed = true;
      }
    } else if (f.cpu.used > f.cpu.total + 0.01) {
      if (swapDamageLow(lo, FIT_LOW.cpu)) {
        mitigations.push(t("atelier.mitig.coProcessor"));
        changed = true;
      } else if (swapTankRig(lo, FIT_RIG.cpu[lo.size])) {
        mitigations.push(t("atelier.mitig.cpuRig"));
        changed = true;
      }
    } else if (f.calibration.used > f.calibration.total + 0.01 && lo.rigs.length > 0) {
      // Calibration dépassée : on retire le dernier rig (slot laissé libre).
      lo.rigs.pop();
      mitigations.push(t("atelier.mitig.rigRemoved"));
      changed = true;
    }
    if (!changed) break;
    eft = assembleEft(hull.name, fitName, lo);
    result = await loadFit(eft, genOpts);
  }

  return { ...result, eft, loadout: lo, mitigations };
}
