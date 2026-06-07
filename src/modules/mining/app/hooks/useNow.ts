import { useEffect, useState } from "react";

/** Renvoie un timestamp qui se rafraîchit toutes les `intervalMs` (par défaut 1s).
 *  Utilisé pour les compteurs de présence en direct. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
