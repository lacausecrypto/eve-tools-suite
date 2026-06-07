/** Types du Journal d'Activité (ISK/heure). */

export type ActivityId =
  | "ratting"
  | "abyssal"
  | "missions"
  | "mining"
  | "exploration"
  | "incursion";

export type PriceBasis = "buy" | "sell";

/** Une ligne de butin valorisée (prix Jita achat & vente mémorisés). */
export interface LootLine {
  typeId: number;
  name: string;
  qty: number;
  unitBuy: number;
  unitSell: number;
}

/** Entrée ISK manuelle (revenu ou coût) : prime, récompense, filament, munition… */
export interface Entry {
  id: string;
  label: string;
  isk: number;
}

/** Session sauvegardée dans l'historique. */
export interface Session {
  id: string;
  activity: ActivityId;
  siteLabel: string;
  durationSec: number;
  runs: number;
  loot: LootLine[];
  income: Entry[];
  costs: Entry[];
  note: string;
  createdAt: number;
}

/** Session active (en cours) — le chrono est dérivé de `runningSince`. */
export interface Draft {
  activity: ActivityId;
  siteLabel: string;
  runningSince: number | null;
  accumulatedSec: number;
  runs: number;
  loot: LootLine[];
  income: Entry[];
  costs: Entry[];
  note: string;
}

/** Totaux calculés d'une session. */
export interface Totals {
  lootValue: number;
  income: number;
  costs: number;
  gross: number;
  net: number;
  hours: number;
  iskPerHour: number;
  netPerRun: number;
}

/** Une ligne du calculateur de taux de drop. */
export interface DropRow {
  typeId: number;
  name: string;
  totalQty: number;
  perRun: number;
  valuePerRun: number;
  appeared: number; // nombre de sessions où l'objet est apparu
  appearedPct: number;
}
