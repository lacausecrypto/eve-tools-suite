/**
 * Aide à la **démo** d'un tour : capture l'état courant d'un store Zustand puis
 * renvoie une fonction qui le restaure tel quel — pour pré-remplir des données
 * d'exemple pendant la visite **sans jamais polluer** les données de l'utilisateur.
 *
 * Usage dans `modules/<id>/tour.ts` :
 *   demo: () => {
 *     const restore = snapshot(useX);
 *     useX.getState().setText(EXAMPLE);
 *     return restore;
 *   }
 */
export function snapshot<T extends object>(store: {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
}): () => void {
  const saved = { ...store.getState() };
  return () => store.setState(saved);
}
