import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { usePirateInput } from "./app/store";

const DEMO_LOCAL = "Mark726\nChribba\nThe Mittani\nGevlon Goblin\nSion Kumitomo";

/** Visite guidée du Pirate's Big Helper (chat Local d'exemple pré-rempli). */
export const pirateTour: ModuleTour = {
  id: "pirate",
  demo: () => {
    const restore = snapshot(usePirateInput);
    usePirateInput.getState().setPasted(DEMO_LOCAL);
    return restore;
  },
  steps: [
    { anchor: "pirate.root", titleKey: "tour.pirate.s1.title", bodyKey: "tour.pirate.s1.body" },
    { anchor: "pirate.root", titleKey: "tour.pirate.s2.title", bodyKey: "tour.pirate.s2.body" },
    { anchor: "pirate.root", titleKey: "tour.pirate.s3.title", bodyKey: "tour.pirate.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.pirate.s1.title": "Intel du Local",
    "tour.pirate.s1.body": "Colle ton chat Local (un exemple de pseudos est déjà collé). En desktop, un raccourci capture le Local automatiquement.",
    "tour.pirate.s2.title": "Profil de menace",
    "tour.pirate.s2.body": "Chaque pilote est profilé : historique de kills, fit probable, vaisseau favori — pour jauger le danger en solo / petit-gang.",
    "tour.pirate.s3.title": "Réseau de gang",
    "tour.pirate.s3.body": "L'outil repère les liens corpo/alliance pour anticiper un gang et décider d'engager ou de fuir.",
  },
  en: {
    "tour.pirate.s1.title": "Local intel",
    "tour.pirate.s1.body": "Paste your Local chat (sample names already pasted). On desktop, a hotkey captures Local automatically.",
    "tour.pirate.s2.title": "Threat profile",
    "tour.pirate.s2.body": "Each pilot is profiled: kill history, likely fit, favorite ship — to gauge danger for solo / small-gang.",
    "tour.pirate.s3.title": "Gang network",
    "tour.pirate.s3.body": "The tool spots corp/alliance links to anticipate a gang and decide whether to engage or run.",
  },
});
