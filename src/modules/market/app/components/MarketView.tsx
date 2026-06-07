import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, BarChart3, LineChart, Loader2, RefreshCw, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { useMarket } from "../store";
import { fetchHistory, fetchMarket, fetchRoute, fetchTypeInfo } from "../api";
import { computeStats, filterOrders } from "../lib/compute";
import { SCOPES, type ScopeId } from "../lib/regions";
import type { HistoryDay, MarketOrder, TypeInfo } from "../lib/types";
import { fmtQty } from "../lib/format";
import { StatTiles } from "./StatTiles";
import { OrderTable } from "./OrderTable";
import { HistoryChart } from "./HistoryChart";
import { DepthChart } from "./DepthChart";

type Load =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; orders: MarketOrder[]; info: TypeInfo };

export function MarketView() {
  const t = useT();
  const { selectedTypeId, selectedName, scope, filters, watchlist, setScope, toggleWatch } =
    useMarket();
  const [load, setLoad] = useState<Load>({ kind: "idle" });
  const [showHistory, setShowHistory] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"price" | "depth">("price");
  const [history, setHistory] = useState<HistoryDay[] | "loading" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [jumps, setJumps] = useState<number | "loading" | null>(null);

  // Chargement du carnet à chaque changement d'objet, de portée, ou rechargement.
  useEffect(() => {
    if (selectedTypeId == null) {
      setLoad({ kind: "idle" });
      return;
    }
    let alive = true;
    setLoad({ kind: "loading" });
    setHistory(null);
    setShowHistory(false);
    (async () => {
      try {
        const [info, orders] = await Promise.all([
          fetchTypeInfo(selectedTypeId),
          fetchMarket(scope, selectedTypeId),
        ]);
        if (alive) setLoad({ kind: "done", orders, info });
      } catch (e) {
        if (alive)
          setLoad({
            kind: "error",
            message: e instanceof Error ? e.message : String(e),
          });
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedTypeId, scope, reloadKey]);

  // Historique à la demande.
  useEffect(() => {
    if (!showHistory || selectedTypeId == null) return;
    let alive = true;
    setHistory("loading");
    fetchHistory(scope, selectedTypeId)
      .then((h) => alive && setHistory(h))
      .catch(() => alive && setHistory([]));
    return () => {
      alive = false;
    };
  }, [showHistory, selectedTypeId, scope]);

  const filtered = useMemo(
    () => (load.kind === "done" ? filterOrders(load.orders, filters) : []),
    [load, filters],
  );
  const sells = useMemo(() => filtered.filter((o) => !o.isBuy), [filtered]);
  const buys = useMemo(() => filtered.filter((o) => o.isBuy), [filtered]);
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  // Route « arbitrage » : du **vendeur le moins cher** vers l'**acheteur le plus
  // cher**, en **absolu**. On n'applique PAS le filtre « sain » (≤ meilleure
  // vente) ici : les acheteurs au-dessus de la vente locale la moins chère sont
  // justement les cibles de hauling inter-hubs — les écarter ramenait à tort tout
  // sur Jita (→ « 0 saut Jita → Jita »).
  const tradeRoute = useMemo(() => {
    const cheapestSell = sells.reduce<MarketOrder | null>(
      (m, o) => (!m || o.price < m.price ? o : m),
      null,
    );
    const highestBuy = buys.reduce<MarketOrder | null>(
      (m, o) => (!m || o.price > m.price ? o : m),
      null,
    );
    return { from: cheapestSell, to: highestBuy };
  }, [sells, buys]);

  // Calcul des sauts (ESI route) entre les deux systèmes.
  useEffect(() => {
    const from = tradeRoute.from?.systemId;
    const to = tradeRoute.to?.systemId;
    if (from == null || to == null) {
      setJumps(null);
      return;
    }
    if (from === to) {
      setJumps(0);
      return;
    }
    let alive = true;
    setJumps("loading");
    fetchRoute(from, to)
      .then((n) => alive && setJumps(n))
      .catch(() => alive && setJumps(null));
    return () => {
      alive = false;
    };
  }, [tradeRoute.from?.systemId, tradeRoute.to?.systemId]);

  const ScopeSelect = (
    <Select value={scope} onValueChange={(v) => setScope(v as ScopeId)}>
      <SelectTrigger className="h-8 w-56 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SCOPES).map(([id, s]) => (
          <SelectItem key={id} value={id}>
            {id === "hubs" ? t("market.scope.hubs") : s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (selectedTypeId == null) {
    return <EmptyState scopeSelect={ScopeSelect} />;
  }

  const watched = watchlist.includes(selectedTypeId);
  const displayName = load.kind === "done" ? load.info.name : selectedName ?? `#${selectedTypeId}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* En-tête objet */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <img
          src={typeIconUrl(selectedTypeId, 64)}
          alt=""
          className="h-12 w-12 rounded-md border border-border bg-background"
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{displayName}</h2>
          {load.kind === "done" && load.info.volume != null && (
            <p className="text-xs text-muted-foreground">
              {t("market.header.unitVolume", { n: fmtQty(load.info.volume) })}
            </p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {ScopeSelect}
          <Button
            variant={watched ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleWatch(selectedTypeId)}
          >
            <Star className={cn("h-4 w-4", watched && "fill-current text-amber-400")} />
            {t("market.action.watch")}
          </Button>
          <Button
            variant={showHistory ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowHistory((s) => !s)}
          >
            <BarChart3 className="h-4 w-4" />
            {t("market.action.analyze")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReloadKey((k) => k + 1)}
            title={t("market.action.refresh")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {load.kind === "loading" && (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> {t("market.loading.book")}
        </div>
      )}

      {load.kind === "error" && (
        <div className="m-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">{t("market.error.load")}</div>
            <div className="text-muted-foreground">{load.message}</div>
          </div>
        </div>
      )}

      {load.kind === "done" && (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="space-y-4 px-5 py-4">
            <StatTiles
              stats={stats}
              jumps={jumps}
              fromSystem={tradeRoute.from?.systemName ?? null}
              toSystem={tradeRoute.to?.systemName ?? null}
            />

            {showHistory && (
              <section className="rounded-xl border border-border bg-card/40 p-4">
                <div className="mb-3 flex rounded-md border border-border p-0.5 sm:w-fit">
                  <AnalyticsTab
                    active={analyticsTab === "price"}
                    onClick={() => setAnalyticsTab("price")}
                    icon={<LineChart className="h-3.5 w-3.5" />}
                  >
                    {t("market.tab.priceVolume")}
                  </AnalyticsTab>
                  <AnalyticsTab
                    active={analyticsTab === "depth"}
                    onClick={() => setAnalyticsTab("depth")}
                    icon={<Activity className="h-3.5 w-3.5" />}
                  >
                    {t("market.tab.depth")}
                  </AnalyticsTab>
                </div>
                {analyticsTab === "price" ? (
                  history === "loading" || history === null ? (
                    <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("market.loading.history")}
                    </div>
                  ) : (
                    <HistoryChart days={history} sellVolume={stats.sellVolume} />
                  )
                ) : (
                  <DepthChart sells={sells} buys={buys} />
                )}
              </section>
            )}

            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-success">
                <TrendingUp className="h-4 w-4" /> {t("market.section.sellers", { n: sells.length })}
              </h3>
              <div className="rounded-xl border border-border">
                <OrderTable orders={sells} side="sell" />
              </div>
            </section>

            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                <TrendingUp className="h-4 w-4 rotate-180" /> {t("market.section.buyers", { n: buys.length })}
              </h3>
              <div className="rounded-xl border border-border">
                <OrderTable orders={buys} side="buy" />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({ scopeSelect }: { scopeSelect: React.ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <TrendingUp className="mb-3 h-12 w-12 text-muted-foreground/60" />
      <h2 className="text-lg font-semibold">{t("market.empty.title")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {t("market.empty.body")}
      </p>
      <div className="mt-4">{scopeSelect}</div>
      {!isTauri() && (
        <p className="mt-4 max-w-md text-xs text-muted-foreground/70">
          {t("market.empty.webNote")}
        </p>
      )}
    </div>
  );
}
