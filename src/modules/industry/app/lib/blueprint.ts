/**
 * Auto-remplissage des recettes depuis les données blueprint **publiques** de
 * Fuzzwork (`/blueprint/api/blueprint.php?typeid=<bpId>`), dérivées du SDE CCP.
 *
 * Flux : nom du produit → on résout son **blueprint** (« <produit> Blueprint »
 * pour la fabrication, « <produit> Reaction Formula » pour les réactions) →
 * Fuzzwork donne matériaux + temps de base + sortie/run → on résout les noms des
 * matériaux. Le parseur est **pur et tolérant** au schéma exact, et tout
 * échec retombe proprement sur la saisie manuelle (qui marche déjà).
 */
import { resolveNames } from "@/core/universe";
import { resolveTypeIds } from "@/core/pricing";
import { thirdPartyJson } from "@/core/http/thirdParty";
import type { ActivityType } from "./industry";

/** Id d'activité SDE : 1 = fabrication, 11 = réaction. */
const ACTIVITY_ID: Record<ActivityType, number> = {
  manufacturing: 1,
  reaction: 11,
};

const FUZZWORK_BP = "https://www.fuzzwork.co.uk/blueprint/api/blueprint.php";

/** Recette résolue, prête à charger dans le calculateur. */
export interface ResolvedBlueprint {
  activity: ActivityType;
  outputTypeId: number;
  outputName: string;
  outputPerRun: number;
  /** Temps de base par run (secondes, TE 0). 0 si inconnu. */
  baseTimePerRun: number;
  materials: { typeId: number; name: string; baseQty: number }[];
}

/** Données brutes extraites d'un blueprint Fuzzwork (avant résolution des noms). */
export interface ParsedBlueprint {
  productTypeId: number;
  outputPerRun: number;
  baseTimePerRun: number;
  materials: { typeId: number; baseQty: number }[];
}

/** Coerce en nombre fini (Fuzzwork renvoie souvent des chaînes). */
function num(x: unknown): number {
  const n = typeof x === "string" ? parseFloat(x) : (x as number);
  return Number.isFinite(n) ? n : 0;
}

function typeIdOf(o: Record<string, unknown>): number {
  return num(o.typeid ?? o.typeID ?? o.type_id);
}

/** Lit le temps de base d'une activité, tolérant à plusieurs schémas Fuzzwork. */
function readTime(json: Record<string, unknown>, activityId: number): number {
  const key = String(activityId);
  for (const field of ["activityTimes", "times", "activityTime"]) {
    const node = (json[field] as Record<string, unknown> | undefined)?.[key];
    if (node == null) continue;
    if (Array.isArray(node)) return num((node[0] as Record<string, unknown>)?.time ?? node[0]);
    if (typeof node === "object") return num((node as Record<string, unknown>).time);
    return num(node);
  }
  return 0;
}

/**
 * Parse une réponse Fuzzwork pour une activité donnée. **Pur** (testable).
 * Renvoie `null` si l'activité n'a pas de matériaux (blueprint non applicable).
 */
export function parseFuzzworkBlueprint(
  json: Record<string, unknown>,
  activityId: number,
): ParsedBlueprint | null {
  const key = String(activityId);
  const matsRaw = (json.activityMaterials as Record<string, unknown> | undefined)?.[key];
  if (!Array.isArray(matsRaw) || matsRaw.length === 0) return null;

  const materials = matsRaw
    .map((m) => {
      const o = m as Record<string, unknown>;
      return { typeId: typeIdOf(o), baseQty: num(o.quantity ?? o.qty) };
    })
    .filter((m) => m.typeId > 0 && m.baseQty > 0);
  if (materials.length === 0) return null;

  const prodRaw = (json.activityProducts as Record<string, unknown> | undefined)?.[key];
  const product = Array.isArray(prodRaw) ? (prodRaw[0] as Record<string, unknown>) : undefined;
  const productTypeId = product ? typeIdOf(product) : 0;
  const outputPerRun = product ? Math.max(1, num(product.quantity)) : 1;

  return {
    productTypeId,
    outputPerRun,
    baseTimePerRun: readTime(json, activityId),
    materials,
  };
}

/** Récupère le blueprint Fuzzwork par id de blueprint (best-effort). */
async function fetchFuzzwork(blueprintTypeId: number): Promise<Record<string, unknown> | null> {
  try {
    return await thirdPartyJson<Record<string, unknown>>(`${FUZZWORK_BP}?typeid=${blueprintTypeId}`);
  } catch {
    return null;
  }
}

/**
 * Résout une recette complète à partir du **nom du produit**. Tente la
 * fabrication (« <nom> Blueprint ») puis la réaction (« <nom> Reaction
 * Formula »). Renvoie `null` si rien n'est trouvé (→ saisie manuelle).
 */
export async function fetchBlueprintForProduct(
  productName: string,
): Promise<ResolvedBlueprint | null> {
  const name = productName.trim();
  if (!name) return null;

  const candidates: { activity: ActivityType; bpName: string }[] = [
    { activity: "manufacturing", bpName: `${name} Blueprint` },
    { activity: "reaction", bpName: `${name} Reaction Formula` },
  ];

  // Résout en un seul appel : produit + noms de blueprint candidats.
  const idMap = await resolveTypeIds([name, ...candidates.map((c) => c.bpName)]);
  const productTypeId = idMap.get(name.toLowerCase())?.id ?? 0;

  for (const c of candidates) {
    const bp = idMap.get(c.bpName.toLowerCase());
    if (!bp) continue;
    const json = await fetchFuzzwork(bp.id);
    if (!json) continue;
    const parsed = parseFuzzworkBlueprint(json, ACTIVITY_ID[c.activity]);
    if (!parsed) continue;

    // Résout les noms des matériaux (et du produit en repli).
    const ids = parsed.materials.map((m) => m.typeId);
    const names = await resolveNames(ids);
    return {
      activity: c.activity,
      outputTypeId: parsed.productTypeId || productTypeId,
      outputName: name,
      outputPerRun: parsed.outputPerRun,
      baseTimePerRun: parsed.baseTimePerRun,
      materials: parsed.materials.map((m) => ({
        typeId: m.typeId,
        name: names.get(m.typeId)?.name ?? `#${m.typeId}`,
        baseQty: m.baseQty,
      })),
    };
  }
  return null;
}
