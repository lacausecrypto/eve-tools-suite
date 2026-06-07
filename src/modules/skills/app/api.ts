/**
 * Import ESI **authentifié** (via le client conforme de la suite, M4) :
 * file de compétences et attributs du personnage actif. Nécessite un login SSO
 * (donc le `CLIENT_ID` enregistré — cf. M5) ; sinon le mode manuel reste pleinement
 * fonctionnel.
 */
import { esiGetAuth } from "@/core/esi/client";
import { track } from "@/core/analytics";
import type { PlanItem } from "./lib/plan";
import type { AttrSet } from "./lib/sp";

interface QueueEntry {
  skill_id: number;
  finished_level: number;
}

/** File de compétences → plan (une entrée par compétence, niveaux fusionnés). */
export async function fetchSkillQueue(
  characterId: number,
): Promise<PlanItem[]> {
  track("skills_esi_import");
  const q = await esiGetAuth<QueueEntry[]>(
    `/characters/${characterId}/skillqueue/`,
    characterId,
  );
  const map = new Map<number, { from: number; to: number }>();
  for (const e of q) {
    const to = e.finished_level;
    const from = to - 1;
    const cur = map.get(e.skill_id);
    if (!cur) map.set(e.skill_id, { from, to });
    else
      map.set(e.skill_id, {
        from: Math.min(cur.from, from),
        to: Math.max(cur.to, to),
      });
  }
  return [...map].map(([skillId, { from, to }]) => ({ skillId, from, to }));
}

interface AttrResponse {
  charisma: number;
  intelligence: number;
  memory: number;
  perception: number;
  willpower: number;
}

/** Attributs courants du personnage (base, hors implants). */
export async function fetchAttributes(
  characterId: number,
): Promise<AttrSet> {
  const a = await esiGetAuth<AttrResponse>(
    `/characters/${characterId}/attributes/`,
    characterId,
  );
  return {
    int: a.intelligence,
    mem: a.memory,
    per: a.perception,
    will: a.willpower,
    cha: a.charisma,
  };
}
