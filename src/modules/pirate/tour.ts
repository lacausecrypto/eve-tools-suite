import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { usePirateInput } from "./app/store";

const DEMO_LOCAL = "Mark726\nChribba\nThe Mittani\nGevlon Goblin\nSion Kumitomo";

export const pirateTour: ModuleTour = {
  id: "pirate",
  demo: () => {
    const restore = snapshot(usePirateInput);
    usePirateInput.getState().setPasted(DEMO_LOCAL);
    return restore;
  },
  steps: [
    { anchor: "pirate.input", titleKey: "tour.pirate.input.title", bodyKey: "tour.pirate.input.body" },
    { anchor: "pirate.analyze", titleKey: "tour.pirate.analyze.title", bodyKey: "tour.pirate.analyze.body" },
    { anchor: "pirate.watchlist", titleKey: "tour.pirate.watch.title", bodyKey: "tour.pirate.watch.body" },
  ],
};

registerMessages({
  fr: {
    "tour.pirate.input.title": "1. Le chat Local",
    "tour.pirate.input.body": "Colle les pseudos du Local (un exemple est rempli). En desktop, un raccourci (Ctrl/Cmd+Shift+L) capture le Local automatiquement.",
    "tour.pirate.analyze.title": "2. Analyser les menaces",
    "tour.pirate.analyze.body": "Chaque pilote est profilé : niveau de menace, K/D, sec-status, fit probable et vaisseau favori — pour décider d'engager ou de fuir en solo / petit-gang.",
    "tour.pirate.watch.title": "3. Watchlist & filtres",
    "tour.pirate.watch.body": "Tague et suis des pilotes (foe / cyno / spy / friend) dans une watchlist persistante ; filtre la liste pour ne garder que les vraies menaces.",
  },
  en: {
    "tour.pirate.input.title": "1. Local chat",
    "tour.pirate.input.body": "Paste the Local pilot names (a sample is filled). On desktop, a hotkey (Ctrl/Cmd+Shift+L) captures Local automatically.",
    "tour.pirate.analyze.title": "2. Analyze threats",
    "tour.pirate.analyze.body": "Each pilot is profiled: threat level, K/D, sec status, likely fit and favorite ship — to decide whether to engage or run, solo / small-gang.",
    "tour.pirate.watch.title": "3. Watchlist & filters",
    "tour.pirate.watch.body": "Tag and track pilots (foe / cyno / spy / friend) in a persistent watchlist; filter the list to keep only real threats.",
  },
});
