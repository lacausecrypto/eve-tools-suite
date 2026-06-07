/**
 * Index de noms d'objets pour l'autocomplétion du calculateur. Combine :
 *  - les minéraux (matériaux de base),
 *  - le **catalogue curé du module Market** (`CATALOG_NAMES` : vaisseaux, modules…),
 *  - une liste d'items d'industrie courants (fuel, glace, PI, composants).
 *
 * Volontairement **curé** (pas le SDE complet, comme Market) : les suggestions
 * couvrent l'usuel ; la **saisie libre** reste possible pour tout autre nom exact
 * (résolu via `/universe/ids/` au calcul) et l'auto-fill blueprint remplit les
 * matériaux sans saisie.
 */
import { CATALOG_NAMES } from "@/modules/market/app/lib/catalog";
import { MINERALS } from "./minerals";

/** Items d'industrie fréquents absents du catalogue de combat. */
const INDUSTRY_ITEMS: string[] = [
  // Carburant de structure
  "Nitrogen Fuel Block", "Hydrogen Fuel Block", "Helium Fuel Block", "Oxygen Fuel Block",
  // Produits de glace
  "Heavy Water", "Liquid Ozone", "Strontium Clathrates",
  "Helium Isotopes", "Hydrogen Isotopes", "Nitrogen Isotopes", "Oxygen Isotopes",
  // Composants avancés (T2)
  "Construction Blocks", "Fernite Carbide", "Tungsten Carbide", "Titanium Carbide",
  "Crystalline Carbonide", "Sylramic Fibers", "Nanotransistors", "Phenolic Composites",
  // PI (planetary)
  "Water", "Oxygen", "Coolant", "Mechanical Parts", "Consumer Electronics",
  "Robotics", "Enriched Uranium", "Plasmoids", "Reactive Metals", "Precious Metals",
  "Toxic Metals", "Chiral Structures", "Silicon", "Biofuels",
  // Munitions / charges courantes
  "Nanite Repair Paste", "Antimatter Charge M", "Scourge Heavy Missile",
];

/** Liste de noms unique et triée pour l'autocomplétion. */
export const ITEM_NAMES: string[] = [
  ...new Set([
    ...MINERALS.map((m) => m.name),
    ...CATALOG_NAMES,
    ...INDUSTRY_ITEMS,
  ]),
].sort((a, b) => a.localeCompare(b));
