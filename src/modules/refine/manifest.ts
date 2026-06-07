import { Recycle } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { RefineModule } from "./RefineModule";

import { refineTour } from "./tour";

export const refineManifest: ToolModule = {
  id: "refine",
  name: { fr: "Retraitement & Compression", en: "Reprocessing & Compression" },
  tagline: {
    fr: "Minerai → minéraux & mix compressé optimal",
    en: "Ore → minerals & optimal compressed mix",
  },
  description: {
    fr:
      "Deux outils en un. Reprocess : colle ton minerai → minéraux récupérés " +
      "avec le rendement EVE exact (compétences, structure, implant), valeur " +
      "raffinée vs minerai brut et le verdict « raffiner ou vendre ». " +
      "Compression : saisis tes besoins en minéraux → le mix de minerai " +
      "compressé le moins cher à acheter (coût et volume minimisés) après ton " +
      "rendement. Compositions issues du SDE, prix via Fuzzwork. 100 % public.",
    en:
      "Two tools in one. Reprocess: paste your ore → recovered minerals with the " +
      "exact EVE yield (skills, structure, implant), refined vs raw ore value and " +
      "the refine-or-sell verdict. Compression: enter your mineral needs → the " +
      "cheapest compressed-ore mix to buy (minimized cost and volume) after your " +
      "yield. Compositions from the SDE, prices via Fuzzwork. Fully public.",
  },
  icon: Recycle,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Fuzzwork"],
    eulaSafe: true,
  },
  component: RefineModule,
  tour: refineTour,
};
