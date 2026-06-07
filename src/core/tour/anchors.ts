/**
 * Noms d'ancres `data-tour` du **shell** (centralisés pour éviter les fautes).
 * Les ancres propres à un outil sont co-localisées dans `modules/<id>/tour.ts`.
 */
export const SHELL_ANCHOR = {
  dashboardBtn: "shell.dashboardBtn",
  toolsBtn: "shell.toolsBtn",
  accountBtn: "shell.accountBtn",
  settingsBtn: "shell.settingsBtn",
  tabStrip: "shell.tabStrip",
  boardEdit: "shell.boardEdit",
  boardAdd: "shell.boardAdd",
  toolCard: "shell.toolCard",
  tourBtn: "shell.tourBtn",
} as const;
