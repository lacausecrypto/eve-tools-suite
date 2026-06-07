import { BarChart3, GraduationCap, Hourglass, Wand2 } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { ESI_SCOPES } from "@/core/app";
import { SkillsModule } from "./SkillsModule";
import {
  SkillPlanWidget,
  SkillRemapBarsWidget,
  SkillRemapWidget,
  skillPlanConfig,
  skillRemapBarsConfig,
  skillRemapConfig,
} from "./widgets";

export const skillsManifest: ToolModule = {
  id: "skills",
  name: { fr: "Optimiseur de Compétences", en: "Skill & Remap Optimizer" },
  tagline: {
    fr: "Planifie tes skills et trouve le remap d'attributs optimal",
    en: "Plan your skills and find the optimal attribute remap",
  },
  description: {
    fr:
      "Construis un plan d'entraînement (510 compétences, données CCP exactes), vois " +
      "les SP et le temps total, et obtiens le **remap d'attributs optimal** qui " +
      "minimise la durée — avec implants et clone Alpha/Omega. Importe ta file et tes " +
      "attributs via ESI, ou planifie à la main. Le successeur léger d'EVEMon.",
    en:
      "Build a training plan (510 skills, exact CCP data), see total SP and time, and " +
      "get the **optimal attribute remap** that minimizes duration — with implants and " +
      "Alpha/Omega clone state. Import your queue and attributes via ESI, or plan " +
      "manually. The lightweight EVEMon successor.",
  },
  icon: GraduationCap,
  accent: "hsl(var(--fc))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: false,
    auth: true,
    scopes: [ESI_SCOPES.readSkills, ESI_SCOPES.readSkillQueue],
    eulaSafe: true,
  },
  component: SkillsModule,
  widgets: [
    {
      id: "plan",
      title: { fr: "Skills — temps du plan", en: "Skills — plan time" },
      icon: Hourglass,
      size: "sm",
      config: skillPlanConfig,
      component: SkillPlanWidget,
    },
    {
      id: "remap",
      title: { fr: "Skills — gain de remap", en: "Skills — remap savings" },
      icon: Wand2,
      size: "sm",
      config: skillRemapConfig,
      component: SkillRemapWidget,
    },
    {
      id: "remap-bars",
      title: { fr: "Skills — remap optimal", en: "Skills — optimal remap" },
      icon: BarChart3,
      size: "md",
      config: skillRemapBarsConfig,
      component: SkillRemapBarsWidget,
    },
  ],
};
