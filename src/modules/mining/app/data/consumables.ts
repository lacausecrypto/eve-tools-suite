// Consommables de minage (cristaux de laser de minage).
//
// Les cristaux de minage (« Simple Asteroid Mining Crystal Type B II », etc.)
// apparaissent dans les Diffusions comme des objets « looted », mais ce ne sont
// PAS du minerai : ce sont des consommables qui s'usent pendant la session.
// Ils ne doivent donc jamais entrer dans la valorisation ni dans le payout du
// minerai. On les suit séparément (qui a consommé quoi, en quelle quantité).

const CONSUMABLE_RE = /mining\s+crystal/i;

/** Vrai si l'objet « looté » est un consommable (cristal de minage), pas du minerai. */
export function isConsumable(name: string): boolean {
  return CONSUMABLE_RE.test(name);
}

/** Libellé court d'un cristal pour l'affichage (retire le préfixe redondant). */
export function consumableShortLabel(name: string): string {
  return name
    .replace(/^Simple\s+/i, "")
    .replace(/Asteroid\s+Mining\s+Crystal\s+/i, "Mining Crystal ")
    .trim();
}
