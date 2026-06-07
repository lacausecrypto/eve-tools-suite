/** Types de l'Appraiser Abyssal (mutaplasmides). */

/** Référence d'un module abyssal lié (depuis un lien de chat). */
export interface ItemRef {
  /** type_id du module **résultat** (abyssal). */
  typeId: number;
  /** item_id de l'instance dynamique (unique). */
  itemId: number;
}

/** Item dynamique renvoyé par l'ESI `/dogma/dynamic/items/`. */
export interface DynamicItem {
  sourceTypeId: number;
  mutatorTypeId: number;
  /** attribute_id → valeur rollée. */
  attrs: Record<number, number>;
}

/** Score d'un attribut muté. */
export interface AttrScore {
  attrId: number;
  name: string;
  high: boolean;
  unit: number;
  base: number;
  rolled: number;
  min: number;
  max: number;
  /** Qualité 0..1 (1 = god-roll), orientée selon highIsGood. */
  quality: number;
  /** Variation vs base en % (signée). */
  pctVsBase: number;
}

/** Score complet d'un module rollé. */
export interface RollScore {
  mutatorTypeId: number;
  baseTypeId: number;
  resultTypeId: number;
  attrs: AttrScore[];
  /** Qualité globale 0..1 (moyenne). */
  overall: number;
}

/** Une plage de mutation (mode explorateur). */
export interface RangeRow {
  attrId: number;
  name: string;
  high: boolean;
  unit: number;
  base: number;
  min: number;
  max: number;
}
