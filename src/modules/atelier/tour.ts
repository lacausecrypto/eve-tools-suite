import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAtelier } from "./app/store";

const DEMO_FIT = `[Rifter, Tour démo]
200mm AutoCannon II
200mm AutoCannon II
200mm AutoCannon II

1MN Afterburner II
Warp Scrambler II
Stasis Webifier II

Damage Control II
Gyrostabilizer II
Small Armor Repairer II`;

export const atelierTour: ModuleTour = {
  id: "atelier",
  demo: () => {
    const restore = snapshot(useAtelier);
    useAtelier.getState().setEft(DEMO_FIT);
    return restore;
  },
  steps: [
    { anchor: "atelier.tabs", titleKey: "tour.atelier.tabs.title", bodyKey: "tour.atelier.tabs.body" },
    { anchor: "atelier.hull", titleKey: "tour.atelier.hull.title", bodyKey: "tour.atelier.hull.body" },
    { anchor: "atelier.generate", titleKey: "tour.atelier.generate.title", bodyKey: "tour.atelier.generate.body" },
    { anchor: "atelier.eft", titleKey: "tour.atelier.eft.title", bodyKey: "tour.atelier.eft.body" },
  ],
};

registerMessages({
  fr: {
    "tour.atelier.tabs.title": "1. Générer ou Analyser",
    "tour.atelier.tabs.body": "Deux modes partageant le même moteur : générer un fit selon ton besoin, ou analyser un fit EFT collé.",
    "tour.atelier.hull.title": "2. Le besoin",
    "tour.atelier.hull.body": "Saisis un vaisseau (autocomplétion). Choisis ensuite le rôle, le tank (bouclier/armure/auto) et l'arme dans les listes juste à côté.",
    "tour.atelier.generate.title": "3. Générer",
    "tour.atelier.generate.body": "Un fit T2 cohérent et montable (CPU/grille) — armes, tank, propulsion, rigs et drones — copiable en EFT vers le jeu.",
    "tour.atelier.eft.title": "4. Analyser",
    "tour.atelier.eft.body": "Onglet Analyser : colle un EFT (un exemple est prêt) → EHP, capacitor, navigation, DPS et résistances, avec bonus de vaisseau niveau V.",
  },
  en: {
    "tour.atelier.tabs.title": "1. Generate or Analyze",
    "tour.atelier.tabs.body": "Two modes sharing one engine: generate a fit for your need, or analyze a pasted EFT fit.",
    "tour.atelier.hull.title": "2. The need",
    "tour.atelier.hull.body": "Enter a ship (autocomplete). Then pick the role, tank (shield/armor/auto) and weapon in the lists right next to it.",
    "tour.atelier.generate.title": "3. Generate",
    "tour.atelier.generate.body": "A coherent, fittable T2 loadout (CPU/grid) — weapons, tank, prop, rigs and drones — copyable as EFT to the game.",
    "tour.atelier.eft.title": "4. Analyze",
    "tour.atelier.eft.body": "Analyze tab: paste an EFT (a sample is ready) → EHP, capacitor, navigation, DPS and resistances, with level-V hull bonuses.",
  },
});
