import { Atom } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { AbyssalModule } from "./AbyssalModule";

export const abyssalManifest: ToolModule = {
  id: "abyssal",
  name: { fr: "Estimateur Abyssal", en: "Abyssal Appraiser" },
  tagline: {
    fr: "Qualité des rolls mutaplasmides — plages & god-rolls",
    en: "Mutaplasmid roll quality — ranges & god-rolls",
  },
  description: {
    fr:
      "Évalue un module abyssal (muté) : lie-le dans un chat, colle le lien, et " +
      "l'outil situe chaque attribut rollé dans sa plage possible (plancher → " +
      "god-roll) via l'ESI dynamique, avec un score global, le coût de roll et " +
      "le prix de revente estimé par contrat (MutaMarket, avec marge de " +
      "fiabilité et contrat live éventuel). Mode explorateur pour visualiser les " +
      "plages plancher/plafond avant de roller. 100 % ESI publique + MutaMarket.",
    en:
      "Rate an abyssal (mutated) module: link it in chat, paste the link, and the " +
      "tool places each rolled attribute within its possible range (floor → " +
      "god-roll) via dynamic ESI, with an overall score, roll cost and the " +
      "estimated contract resale price (MutaMarket, with confidence margin and " +
      "any live contract). Explorer mode shows floor/ceiling ranges before " +
      "rolling. Public ESI + MutaMarket.",
  },
  icon: Atom,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Hoboleaks (SDE)", "Fuzzwork", "MutaMarket"],
    eulaSafe: true,
  },
  component: AbyssalModule,
};
