import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { usePiSetups } from "./app/store";

/** Visite guidée du PI Sim (setup d'extraction d'exemple). */
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
    { anchor: "pi.root", titleKey: "tour.pi.s1.title", bodyKey: "tour.pi.s1.body" },
    { anchor: "pi.root", titleKey: "tour.pi.s2.title", bodyKey: "tour.pi.s2.body" },
    { anchor: "pi.root", titleKey: "tour.pi.s3.title", bodyKey: "tour.pi.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.pi.s1.title": "Simulateur de PI",
    "tour.pi.s1.body": "Planifie une extraction mono-planète (un setup d'exemple est sauvegardé) : planète, ressource, têtes d'extraction, durée, usines P1.",
    "tour.pi.s2.title": "Net ISK / heure",
    "tour.pi.s2.body": "L'outil simule le rendement : quantité par cycle, taxe POCO, coût de setup → un net ISK/heure et un ROI.",
    "tour.pi.s3.title": "Portefeuille & comparaison",
    "tour.pi.s3.body": "Sauvegarde plusieurs setups (par perso/alt) et compare-les pour optimiser la charge de gestion de tes planètes.",
  },
  en: {
    "tour.pi.s1.title": "PI simulator",
    "tour.pi.s1.body": "Plan a single-planet extraction (a sample setup is saved): planet, resource, extractor heads, duration, P1 factories.",
    "tour.pi.s2.title": "Net ISK / hour",
    "tour.pi.s2.body": "The tool simulates the yield: qty per cycle, POCO tax, setup cost → a net ISK/hour and ROI.",
    "tour.pi.s3.title": "Portfolio & comparison",
    "tour.pi.s3.body": "Save several setups (per character/alt) and compare them to optimize your planets' management load.",
  },
});
