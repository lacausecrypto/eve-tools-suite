import { Skull, Star } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { PirateModule } from "./PirateModule";
import { PirateWatchlistWidget } from "./widgets";

export const pirateManifest: ToolModule = {
  id: "pirate",
  name: { fr: "L'Assistant du Pirate", en: "Pirate's Big Helper" },
  tagline: {
    fr: "Intel local-chat pour le PvP solo & small-gang",
    en: "Local-chat intel for solo & small-gang PvP",
  },
  description: {
    fr:
      "Colle ton local (Ctrl+A → Ctrl+C) et résous chaque pilote en parallèle : " +
      "tableau trié par menace — qui est dangereux, qui est un newbro, ce qu'il vole, " +
      "cyno, et si tu es dans son créneau horaire. Décide « fight or flight » en 2 secondes.",
    en:
      "Paste your local (Ctrl+A → Ctrl+C) and resolve every pilot in parallel: a " +
      "threat-sorted table — who's dangerous, who's a newbro, what they fly, cyno, and " +
      "whether you're in their primetime. Decide “fight or flight” in 2 seconds.",
  },
  icon: Skull,
  accent: "hsl(var(--fleur))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["zKillboard"],
    eulaSafe: true,
  },
  component: PirateModule,
  widgets: [
    {
      id: "watchlist",
      title: { fr: "Pirate — watchlist", en: "Pirate — watchlist" },
      icon: Star,
      size: "sm",
      component: PirateWatchlistWidget,
    },
  ],
};
