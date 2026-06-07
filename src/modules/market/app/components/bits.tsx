/** Petits utilitaires visuels partagés du Market Browser. */

/** Couleur de bouton (bordure + texte) pour les bascules de sécurité. */
export function secColorBtn(kind: "high" | "low" | "null"): string {
  switch (kind) {
    case "high":
      return "border-success/50 bg-success/10 text-success";
    case "low":
      return "border-amber-500/50 bg-amber-500/10 text-amber-400";
    case "null":
      return "border-destructive/50 bg-destructive/10 text-destructive";
  }
}
