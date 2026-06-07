/** Helpers DOM du tour : résolution d'ancres et suivi de position. */

/** Élément portant `data-tour="<name>"` (le premier visible), ou null. */
export function anchorEl(name: string): HTMLElement | null {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`),
  );
  // Préfère un élément réellement visible (un onglet inactif peut être monté
  // mais masqué via `hidden`/display:none).
  return els.find((el) => el.offsetParent !== null) ?? els[0] ?? null;
}

/**
 * Attend l'apparition d'une ancre (l'étape peut ouvrir un outil avant que son
 * élément soit monté). Résout l'élément, ou null après `timeoutMs`.
 */
export function waitForAnchor(
  name: string,
  timeoutMs = 4000,
): Promise<HTMLElement | null> {
  const existing = anchorEl(name);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    let done = false;
    const finish = (el: HTMLElement | null) => {
      if (done) return;
      done = true;
      obs.disconnect();
      clearTimeout(to);
      resolve(el);
    };
    const obs = new MutationObserver(() => {
      const el = anchorEl(name);
      if (el) finish(el);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const to = setTimeout(() => finish(null), timeoutMs);
  });
}

/**
 * Suit la position/taille d'un élément (scroll + resize + ResizeObserver) et
 * notifie via `cb`. Renvoie une fonction de nettoyage.
 */
export function observeRect(el: HTMLElement, cb: () => void): () => void {
  const ro = new ResizeObserver(cb);
  ro.observe(el);
  window.addEventListener("scroll", cb, true);
  window.addEventListener("resize", cb);
  return () => {
    ro.disconnect();
    window.removeEventListener("scroll", cb, true);
    window.removeEventListener("resize", cb);
  };
}
