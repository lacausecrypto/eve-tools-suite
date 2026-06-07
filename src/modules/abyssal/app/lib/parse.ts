/**
 * Extraction d'une **référence d'item abyssal** depuis un lien de chat EVE —
 * **pur**. Quand on lie un module muté dans un canal, le texte contient un lien
 * `showinfo:<typeId>//<itemId>`. On accepte aussi deux nombres bruts.
 */
import type { ItemRef } from "./types";

export function parseItemRef(text: string): ItemRef | null {
  const t = text.trim();

  // Format lien : showinfo:47408//1043571243760
  const link = t.match(/showinfo:(\d+)\/\/(\d+)/i);
  if (link) return { typeId: Number(link[1]), itemId: Number(link[2]) };

  // Deux nombres : type_id (petit) + item_id (grand). On distingue par taille.
  const nums = t.match(/\d{2,}/g);
  if (nums && nums.length >= 2) {
    const sorted = nums.map(Number).sort((a, b) => a - b);
    const itemId = sorted[sorted.length - 1];
    const typeId = sorted[0];
    // item_id dynamique = très grand ; type_id = quelques chiffres.
    if (itemId > 1e9 && typeId < 1e8) return { typeId, itemId };
  }
  return null;
}
