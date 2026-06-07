import { useEffect, useState } from "react";
import { useT } from "@/core/i18n";
import { WidgetStat } from "@/components/ui/widget";
import { isTauri } from "@/core/runtime";
import { getWatchlist } from "./app/api";

/** Widget : nombre de pilotes dans la watchlist (cache Rust, desktop). */
export function PirateWatchlistWidget() {
  const t = useT();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!isTauri()) {
      setN(null);
      return;
    }
    let alive = true;
    getWatchlist()
      .then((w) => alive && setN(w.length))
      .catch(() => alive && setN(null));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <WidgetStat
      value={n == null ? "—" : String(n)}
      sub={t("wg.pirate.watchlist")}
      tone={n ? "fleur" : "default"}
    />
  );
}
