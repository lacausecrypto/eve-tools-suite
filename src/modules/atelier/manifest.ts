import { Hammer } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { AtelierModule } from "./AtelierModule";
import { atelierTour } from "./tour";

export const atelierManifest: ToolModule = {
  id: "atelier",
  name: { fr: "Atelier de Fit", en: "Fit Workshop" },
  tagline: {
    fr: "Générateur & analyseur de fit — EHP, cap, navigation, DPS",
    en: "Fit generator & analyzer — EHP, cap, navigation, DPS",
  },
  description: {
    fr:
      "Génère automatiquement un fit complet selon ton besoin (vaisseau, rôle, " +
      "tank, arme, portée) — ajusté pour être montable (CPU/grille) — ou colle " +
      "un fit EFT à décortiquer. Analyse complète : EHP et résistances par " +
      "couche (pénalités d'empilement), stabilité du condensateur, navigation, " +
      "encombrement et puissance de feu, plus contrôles de cohérence. " +
      "Sauvegarde/supprime tes fits proposés. Calculs dérivés des attributs " +
      "dogma via l'ESI publique (/universe/types), profil de dégâts configurable.",
    en:
      "Auto-generate a complete fit from your need (hull, role, tank, weapon, " +
      "range) — adjusted to be mountable (CPU/grid) — or paste an EFT fit to " +
      "dissect. Full analysis: EHP and per-layer resists (stacking penalties), " +
      "capacitor stability, navigation, fitting and firepower, plus sanity " +
      "checks. Save/delete your proposed fits. Computed from dogma attributes " +
      "via public ESI (/universe/types), with a configurable damage profile.",
  },
  icon: Hammer,
  accent: "hsl(var(--primary))",
  status: "stable",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    eulaSafe: true,
  },
  component: AtelierModule,
  tour: atelierTour,
};
