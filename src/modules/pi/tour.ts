import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { usePiSetups } from "./app/store";

export const piTour: ModuleTour = {
  id: "pi",
  demo: () => {
    const restore = snapshot(usePiSetups);
    usePiSetups.getState().saveSetup("Démo — Noble Metals", "", {
      planet: "barren",
      rawId: "noble_metals",
      heads: 10,
      cycleSec: 3600,
      durationHours: 23,
      qtyPerCycle: 3000,
      p1Factories: 5,
      output: "p1",
      price: 1200,
      pocoTaxPct: 5,
      setupCostIsk: 5_000_000,
    });
    return restore;
  },
  steps: [
    { anchor: "pi.modeSelector", titleKey: "tour.pi.mode.title", bodyKey: "tour.pi.mode.body" },
    { anchor: "pi.planet", titleKey: "tour.pi.planet.title", bodyKey: "tour.pi.planet.body" },
    { anchor: "pi.heads", titleKey: "tour.pi.heads.title", bodyKey: "tour.pi.heads.body" },
  ],
};

registerMessages({
  fr: {
    "tour.pi.mode.title": "1. Quatre modes",
    "tour.pi.mode.body": "Extraction (simuler une planète), Chaîne (P1→P4), Disposition, et Portefeuille (comparer tes setups sauvegardés — un exemple y est déjà).",
    "tour.pi.planet.title": "2. Type de planète",
    "tour.pi.planet.body": "Choisis le type de planète : ça filtre les ressources brutes (P0) disponibles à extraire dessus.",
    "tour.pi.heads.title": "3. Têtes & rendement",
    "tour.pi.heads.body": "Règle les têtes d'extraction et la durée : la suite simule la quantité par cycle, la taxe POCO et le coût de setup → un net ISK/heure et un ROI.",
  },
  en: {
    "tour.pi.mode.title": "1. Four modes",
    "tour.pi.mode.body": "Extraction (simulate a planet), Chain (P1→P4), Layout, and Portfolio (compare your saved setups — a sample is already there).",
    "tour.pi.planet.title": "2. Planet type",
    "tour.pi.planet.body": "Pick the planet type: it filters the raw resources (P0) available to extract on it.",
    "tour.pi.heads.title": "3. Heads & yield",
    "tour.pi.heads.body": "Set the extractor heads and duration: the suite simulates qty per cycle, POCO tax and setup cost → a net ISK/hour and ROI.",
  },
});
