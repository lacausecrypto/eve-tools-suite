import type { ActivityId } from "../lib/types";

/**
 * Définition d'une activité. Les libellés affichés sont localisés via i18n :
 * - le titre de l'activité par `t("activity.act." + id)`,
 * - chaque préréglage par `t("activity.preset." + presetId)`.
 * On garde donc ici des identifiants stables, jamais de texte affiché.
 */
export interface ActivityDef {
  id: ActivityId;
  /** Préréglages de revenu rapides (ids → clés i18n « activity.preset.* »). */
  incomePresets: string[];
  /** Préréglages de coût rapides (ids → clés i18n « activity.preset.* »). */
  costPresets: string[];
  /** L'activité se compte en « runs » (sites/poches) → moyenne par run. */
  hasRuns: boolean;
  /** Le butin principal est du minerai (à coller et valoriser). */
  lootIsOre?: boolean;
}

export const ACTIVITIES: ActivityDef[] = [
  {
    id: "ratting",
    incomePresets: ["bounties", "ess"],
    costPresets: ["ammo"],
    hasRuns: false,
  },
  {
    id: "abyssal",
    incomePresets: [],
    costPresets: ["filaments", "ammo"],
    hasRuns: true,
  },
  {
    id: "missions",
    incomePresets: ["reward", "bountiesShort", "lp"],
    costPresets: ["ammo"],
    hasRuns: true,
  },
  {
    id: "mining",
    incomePresets: [],
    costPresets: ["crystals"],
    hasRuns: false,
    lootIsOre: true,
  },
  {
    id: "exploration",
    incomePresets: [],
    costPresets: [],
    hasRuns: true,
  },
  {
    id: "incursion",
    incomePresets: ["iskReward", "bountiesShort"],
    costPresets: [],
    hasRuns: true,
  },
];

export function activityDef(id: ActivityId): ActivityDef {
  return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
}
