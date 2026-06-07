import { registerMessages } from "@/core/i18n";
import { useWorkspace } from "@/core/workspace";
import { SHELL_ANCHOR } from "@/core/tour/anchors";
import type { ModuleTour } from "@/core/tour/types";

const ws = () => useWorkspace.getState();

/** Tour d'accueil (shell) — présente la navigation et les zones clés. */
export const SHELL_TOUR: ModuleTour = {
  id: "shell",
  steps: [
    {
      titleKey: "tour.shell.welcome.title",
      bodyKey: "tour.shell.welcome.body",
      before: () => ws().openDashboard(),
    },
    {
      anchor: SHELL_ANCHOR.toolsBtn,
      titleKey: "tour.shell.tools.title",
      bodyKey: "tour.shell.tools.body",
    },
    {
      anchor: SHELL_ANCHOR.toolCard,
      titleKey: "tour.shell.catalog.title",
      bodyKey: "tour.shell.catalog.body",
      before: () => ws().openTools(),
    },
    {
      anchor: SHELL_ANCHOR.tabStrip,
      titleKey: "tour.shell.tabs.title",
      bodyKey: "tour.shell.tabs.body",
    },
    {
      anchor: SHELL_ANCHOR.boardEdit,
      titleKey: "tour.shell.board.title",
      bodyKey: "tour.shell.board.body",
      before: () => ws().openDashboard(),
    },
    {
      anchor: SHELL_ANCHOR.accountBtn,
      titleKey: "tour.shell.account.title",
      bodyKey: "tour.shell.account.body",
    },
    {
      anchor: SHELL_ANCHOR.settingsBtn,
      titleKey: "tour.shell.settings.title",
      bodyKey: "tour.shell.settings.body",
    },
    {
      titleKey: "tour.shell.done.title",
      bodyKey: "tour.shell.done.body",
    },
  ],
};

registerMessages({
  fr: {
    // Boutons de l'overlay
    "tour.ui.next": "Suivant",
    "tour.ui.prev": "Précédent",
    "tour.ui.skip": "Passer le tour",
    "tour.ui.finish": "Terminer",
    "tour.ui.progress": "{i} / {n}",
    // Invitation au 1er lancement
    "tour.invite.title": "Découvrir l'app en 1 minute ?",
    "tour.invite.body":
      "Une visite guidée rapide te montre la navigation et les outils principaux. Tu peux la relancer à tout moment.",
    "tour.invite.start": "Faire le tour",
    "tour.invite.later": "Plus tard",
    // Bouton « ? » par outil
    "tour.fab.label": "Visite guidée de cet outil",
    "tour.fab.cta": "Visite guidée",
    // Tour shell
    "tour.shell.welcome.title": "Bienvenue dans EVE Tools Suite 👋",
    "tour.shell.welcome.body":
      "15 outils tiers pour EVE Online, réunis dans une seule app. Faisons un tour éclair des repères essentiels.",
    "tour.shell.tools.title": "Le catalogue d'outils",
    "tour.shell.tools.body":
      "Ce bouton ouvre le catalogue : tous les outils (fit, industrie, marché, intel, skills…) s'y trouvent.",
    "tour.shell.catalog.title": "Tes 15 outils",
    "tour.shell.catalog.body":
      "Clique une carte pour ouvrir l'outil dans un onglet. Épingle tes favoris pour les retrouver dans le rail de gauche.",
    "tour.shell.tabs.title": "Tes onglets",
    "tour.shell.tabs.body":
      "Chaque outil ouvert devient un onglet — façon navigateur. L'état de chaque outil est conservé quand tu changes d'onglet.",
    "tour.shell.board.title": "Ton tableau de bord",
    "tour.shell.board.body":
      "Compose un tableau de bord avec des widgets de tes outils (KPIs, mini-graphes). Ce bouton passe en mode édition.",
    "tour.shell.account.title": "Connexion EVE (optionnelle)",
    "tour.shell.account.body":
      "Connecte ton personnage en SSO (lecture seule) pour importer skills, assets ou jobs. La plupart des outils marchent sans login.",
    "tour.shell.settings.title": "Réglages",
    "tour.shell.settings.body":
      "Langue (FR/EN), affichage des heures, animations, et c'est ici que tu pourras rejouer ce tour d'accueil.",
    "tour.shell.done.title": "Prêt à jouer plus malin 🚀",
    "tour.shell.done.body":
      "Chaque outil a son propre mini-tour : clique le bouton « ? » en haut à droite d'un outil pour une démo guidée. Fly safe o7",
    // Réglages — section tour
    "settings.tour.title": "Visite guidée",
    "settings.tour.desc":
      "Revois la présentation de l'app, ou réinitialise les tours déjà vus pour qu'ils soient reproposés.",
    "settings.tour.replay": "Revoir le tour d'accueil",
    "settings.tour.reset": "Réinitialiser les tours vus",
  },
  en: {
    "tour.ui.next": "Next",
    "tour.ui.prev": "Back",
    "tour.ui.skip": "Skip tour",
    "tour.ui.finish": "Done",
    "tour.ui.progress": "{i} / {n}",
    "tour.invite.title": "Take a 1-minute tour?",
    "tour.invite.body":
      "A quick guided walkthrough shows you the navigation and the main tools. You can replay it anytime.",
    "tour.invite.start": "Take the tour",
    "tour.invite.later": "Later",
    "tour.fab.label": "Guided tour of this tool",
    "tour.fab.cta": "Guided tour",
    "tour.shell.welcome.title": "Welcome to EVE Tools Suite 👋",
    "tour.shell.welcome.body":
      "15 third-party tools for EVE Online in one app. Let's take a quick tour of the essentials.",
    "tour.shell.tools.title": "The tool catalog",
    "tour.shell.tools.body":
      "This button opens the catalog: every tool (fitting, industry, market, intel, skills…) lives here.",
    "tour.shell.catalog.title": "Your 15 tools",
    "tour.shell.catalog.body":
      "Click a card to open a tool in a tab. Pin your favorites to find them in the left rail.",
    "tour.shell.tabs.title": "Your tabs",
    "tour.shell.tabs.body":
      "Every open tool becomes a tab — browser-style. Each tool keeps its state when you switch tabs.",
    "tour.shell.board.title": "Your dashboard",
    "tour.shell.board.body":
      "Build a dashboard from your tools' widgets (KPIs, mini-charts). This button enters edit mode.",
    "tour.shell.account.title": "EVE login (optional)",
    "tour.shell.account.body":
      "Sign in with SSO (read-only) to import skills, assets or jobs. Most tools work with no login.",
    "tour.shell.settings.title": "Settings",
    "tour.shell.settings.body":
      "Language (EN/FR), time display, motion — and this is where you can replay this welcome tour.",
    "tour.shell.done.title": "Ready to play smarter 🚀",
    "tour.shell.done.body":
      "Every tool has its own mini-tour: click the “?” button at the top-right of a tool for a guided demo. Fly safe o7",
    "settings.tour.title": "Guided tour",
    "settings.tour.desc":
      "Replay the app walkthrough, or reset already-seen tours so they're offered again.",
    "settings.tour.replay": "Replay the welcome tour",
    "settings.tour.reset": "Reset seen tours",
  },
});
