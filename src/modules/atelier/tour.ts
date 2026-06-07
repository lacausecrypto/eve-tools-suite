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

/** Visite guidée de l'Atelier de Fit (EFT démo pré-rempli pour l'onglet Analyser). */
export const atelierTour: ModuleTour = {
  id: "atelier",
  demo: () => {
    const restore = snapshot(useAtelier);
    useAtelier.getState().setEft(DEMO_FIT);
    return restore;
  },
  steps: [
    { anchor: "atelier.tabs", titleKey: "tour.atelier.tabs.title", bodyKey: "tour.atelier.tabs.body" },
    { anchor: "atelier.root", titleKey: "tour.atelier.generate.title", bodyKey: "tour.atelier.generate.body" },
    { anchor: "atelier.root", titleKey: "tour.atelier.analyze.title", bodyKey: "tour.atelier.analyze.body" },
  ],
};

registerMessages({
  fr: {
    "tour.atelier.tabs.title": "Générer ou Analyser",
    "tour.atelier.tabs.body":
      "Deux modes partageant le même moteur : générer un fit complet selon ton besoin, ou analyser un fit EFT collé.",
    "tour.atelier.generate.title": "Générer un fit",
    "tour.atelier.generate.body":
      "Décris ton besoin (vaisseau, rôle, tank, arme, portée) → un fit T2 cohérent et montable (CPU/grille) avec armes, tank, propulsion, rigs et drones. Copie l'EFT vers le jeu.",
    "tour.atelier.analyze.title": "Analyser un fit",
    "tour.atelier.analyze.body":
      "Onglet Analyser : colle un EFT (un exemple est déjà prêt) → EHP, capacitor, navigation, DPS et résistances, avec bonus de vaisseau au niveau V.",
  },
  en: {
    "tour.atelier.tabs.title": "Generate or Analyze",
    "tour.atelier.tabs.body":
      "Two modes sharing one engine: generate a full fit for your need, or analyze a pasted EFT fit.",
    "tour.atelier.generate.title": "Generate a fit",
    "tour.atelier.generate.body":
      "Describe your need (hull, role, tank, weapon, range) → a coherent, fittable T2 loadout (CPU/grid) with weapons, tank, prop, rigs and drones. Copy the EFT to the game.",
    "tour.atelier.analyze.title": "Analyze a fit",
    "tour.atelier.analyze.body":
      "Analyze tab: paste an EFT (one is pre-filled) → EHP, capacitor, navigation, DPS and resistances, with level-V hull bonuses.",
  },
});
