import { useEffect, useState } from "react";
import { useStore } from "@mining/store/useStore";

/** True une fois l'état rechargé depuis la base locale (persistance asynchrone). */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useStore.persist.hasHydrated()
  );
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
