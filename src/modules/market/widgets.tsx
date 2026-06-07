import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useLocalized, useT } from "@/core/i18n";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import {
  WidgetBars,
  WidgetStat,
  useNow,
  useWidgetBox,
  type WidgetTone,
} from "@/components/ui/widget";
import { typeIconUrl } from "@/core/images";
import { cn } from "@/lib/utils";
import { useMarket } from "./app/store";
import { SCOPES } from "./app/lib/regions";
import { resolveTypeNames } from "./app/api";
import { getQuote, getTypeName, QUOTE_TTL } from "./app/lib/quotes";
import { fmtIskShort, fmtQty } from "./app/lib/format";
import type { MarketStats } from "./app/lib/types";

// ————————————————————————————————————————————————————————————————
// Métriques de marché (partagées par plusieurs widgets)
// ————————————————————————————————————————————————————————————————

type Metric =
  | "bestSell"
  | "bestBuy"
  | "avgSell"
  | "avgBuy"
  | "margin"
  | "marginPct"
  | "spread"
  | "sellVolume";

const METRIC_OPTIONS: WidgetField["options"] = [
  { value: "bestSell", label: { fr: "Vente la moins chère", en: "Best sell" } },
  { value: "bestBuy", label: { fr: "Achat le plus cher", en: "Best buy" } },
  { value: "avgSell", label: { fr: "Vente moy. 5 %", en: "Avg sell 5%" } },
  { value: "avgBuy", label: { fr: "Achat moy. 5 %", en: "Avg buy 5%" } },
  { value: "margin", label: { fr: "Marge (ISK)", en: "Margin (ISK)" } },
  { value: "marginPct", label: { fr: "Marge (%)", en: "Margin (%)" } },
  { value: "spread", label: { fr: "Spread vente−achat", en: "Spread sell−buy" } },
  { value: "sellVolume", label: { fr: "Volume en vente", en: "Sell volume" } },
];

function metricValue(s: MarketStats, m: Metric): number | null {
  switch (m) {
    case "bestSell":
      return s.bestSell;
    case "bestBuy":
      return s.bestBuy;
    case "avgSell":
      return s.avgSell;
    case "avgBuy":
      return s.avgBuy;
    case "margin":
      return s.margin;
    case "marginPct":
      return s.marginPct;
    case "spread":
      return s.bestSell != null && s.bestBuy != null ? s.bestSell - s.bestBuy : null;
    case "sellVolume":
      return s.sellVolume;
  }
}

function metricFmt(m: Metric, v: number | null): string {
  if (v == null) return "—";
  if (m === "marginPct") return `${v.toFixed(1)} %`;
  if (m === "sellVolume") return fmtQty(v);
  return fmtIskShort(v);
}

function metricTone(m: Metric, v: number | null): WidgetTone {
  if (v == null) return "default";
  if (m === "margin" || m === "marginPct" || m === "spread")
    return v > 0 ? "success" : v < 0 ? "destructive" : "default";
  return "fleur";
}

// ————————————————————————————————————————————————————————————————
// Hooks de données (cache mutualisé, rafraîchi par fenêtre de TTL)
// ————————————————————————————————————————————————————————————————

function useRefreshBucket(): number {
  return Math.floor(useNow(60_000) / QUOTE_TTL);
}

/** Résout un nom de type EVE en type_id (ESI public, caché). */
function useResolveTypeId(name: string): number | null {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    const n = name.trim();
    if (!n) {
      setId(null);
      return;
    }
    let alive = true;
    resolveTypeNames([n])
      .then((r) => alive && setId(r[0]?.id ?? null))
      .catch(() => alive && setId(null));
    return () => {
      alive = false;
    };
  }, [name]);
  return id;
}

type QuoteState = { stats: MarketStats | null; loading: boolean; error: boolean };

/** Cotation d'un type pour la portée courante. */
function useQuote(typeId: number | null): QuoteState {
  const scope = useMarket((s) => s.scope);
  const bucket = useRefreshBucket();
  const [st, setSt] = useState<QuoteState>({ stats: null, loading: false, error: false });
  useEffect(() => {
    if (typeId == null) {
      setSt({ stats: null, loading: false, error: false });
      return;
    }
    let alive = true;
    setSt((s) => ({ ...s, loading: true, error: false }));
    getQuote(scope, typeId)
      .then((stats) => alive && setSt({ stats, loading: false, error: false }))
      .catch(() => alive && setSt({ stats: null, loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, [scope, typeId, bucket]);
  return st;
}

/** Cotations d'une liste de types (remplies au fil de l'eau). */
function useQuotes(ids: number[]): Record<number, MarketStats> {
  const scope = useMarket((s) => s.scope);
  const bucket = useRefreshBucket();
  const key = ids.join(",");
  const [map, setMap] = useState<Record<number, MarketStats>>({});
  useEffect(() => {
    let alive = true;
    for (const id of ids)
      getQuote(scope, id)
        .then((s) => alive && setMap((m) => ({ ...m, [id]: s })))
        .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, key, bucket]);
  return map;
}

/** Noms canoniques d'une liste de types (cachés). */
function useTypeNames(ids: number[]): Record<number, string> {
  const key = ids.join(",");
  const [map, setMap] = useState<Record<number, string>>({});
  useEffect(() => {
    let alive = true;
    for (const id of ids)
      getTypeName(id).then((n) => alive && setMap((m) => ({ ...m, [id]: n })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

function Hint({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <div className="grid h-full place-items-center px-2 text-center text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {icon && <AlertCircle className="h-3.5 w-3.5" />}
        {text}
      </span>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// 1) Ticker — prix live d'un type configuré (sm)
// ————————————————————————————————————————————————————————————————

export const marketTickerConfig: WidgetField[] = [
  {
    key: "type",
    label: { fr: "Objet (nom exact EVE)", en: "Item (exact EVE name)" },
    type: "text",
    placeholder: "Tritanium",
    default: "PLEX",
  },
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "bestSell",
    options: METRIC_OPTIONS,
  },
];

export function MarketTickerWidget({ config }: WidgetProps) {
  const loc = useLocalized();
  const name = ((config.type as string) ?? "").trim();
  const metric = ((config.metric as string) || "bestSell") as Metric;
  const id = useResolveTypeId(name);
  const { stats, loading, error } = useQuote(id);
  const scope = useMarket((s) => s.scope);

  if (!name) return <Hint text={loc({ fr: "Choisis un objet", en: "Pick an item" })} />;
  if (id == null && !loading)
    return <Hint icon text={loc({ fr: "Objet introuvable", en: "Item not found" })} />;
  if (error) return <Hint icon text={loc({ fr: "Marché indisponible", en: "Market unavailable" })} />;
  if (!stats) return <Hint text="…" />;

  const v = metricValue(stats, metric);
  return (
    <div className="flex h-full items-center gap-3">
      {id != null && (
        <img
          src={typeIconUrl(id, 64)}
          alt=""
          className="h-11 w-11 shrink-0 rounded bg-background ring-1 ring-border"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <WidgetStat
          value={metricFmt(metric, v)}
          sub={name}
          tone={metricTone(metric, v)}
          hint={SCOPES[scope as string]?.label}
        />
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// 2) Prix de la watchlist — table live (md)
// ————————————————————————————————————————————————————————————————

export const marketPricesConfig: WidgetField[] = [
  {
    key: "value",
    label: { fr: "Donnée affichée", en: "Displayed metric" },
    type: "select",
    default: "bestSell",
    options: METRIC_OPTIONS,
  },
  {
    key: "sort",
    label: { fr: "Tri", en: "Sort" },
    type: "select",
    default: "valueDesc",
    options: [
      { value: "valueDesc", label: { fr: "Valeur décroissante", en: "Value descending" } },
      { value: "valueAsc", label: { fr: "Valeur croissante", en: "Value ascending" } },
      { value: "name", label: { fr: "Nom (A→Z)", en: "Name (A→Z)" } },
    ],
  },
  {
    key: "limit",
    label: { fr: "Lignes max (0 = auto)", en: "Max rows (0 = auto)" },
    type: "number",
    default: 0,
  },
  {
    key: "maxFetch",
    label: { fr: "Types interrogés (charge ESI)", en: "Types queried (ESI load)" },
    type: "number",
    default: 16,
  },
];

export function MarketPricesWidget({ config }: WidgetProps) {
  const loc = useLocalized();
  const watchlist = useMarket((s) => s.watchlist);
  const { height } = useWidgetBox();
  const metric = ((config.value as string) || "bestSell") as Metric;
  const maxFetch = Math.max(1, Number(config.maxFetch) || 16);
  const ids = watchlist.slice(0, maxFetch);
  const quotes = useQuotes(ids);
  const names = useTypeNames(ids);

  if (!watchlist.length)
    return (
      <Hint text={loc({ fr: "Aucun favori — ajoute des objets au suivi", en: "No favorites — add tracked items" })} />
    );

  type Row = { id: number; name: string; v: number | null };
  let rows: Row[] = ids.map((id) => {
    const s = quotes[id];
    return { id, name: names[id] ?? `#${id}`, v: s ? metricValue(s, metric) : null };
  });

  const sort = (config.sort as string) || "valueDesc";
  rows.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const av = a.v ?? -Infinity;
    const bv = b.v ?? -Infinity;
    return sort === "valueAsc" ? av - bv : bv - av;
  });

  const capH = height > 0 ? Math.max(1, Math.floor(height / 30)) : rows.length;
  const lim = Number(config.limit) || 0;
  const cap = lim > 0 ? Math.min(lim, capH) : capH;
  const overflow = rows.length > cap;
  const shown = overflow ? rows.slice(0, Math.max(1, cap - 1)) : rows;
  const hidden = rows.length - shown.length;

  return (
    <div className="flex h-full flex-col gap-1 overflow-hidden">
      {shown.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-xs">
          <img
            src={typeIconUrl(r.id, 32)}
            alt=""
            className="h-5 w-5 shrink-0 rounded bg-background"
            loading="lazy"
          />
          <span className="min-w-0 flex-1 truncate">{r.name}</span>
          <span className={cn("shrink-0 tabular-nums", toneClass(metricTone(metric, r.v)))}>
            {r.v == null ? "…" : metricFmt(metric, r.v)}
          </span>
        </div>
      ))}
      {overflow && (
        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/70">+{hidden}</div>
      )}
    </div>
  );
}

function toneClass(tone: WidgetTone): string {
  return tone === "success"
    ? "text-success"
    : tone === "destructive"
      ? "text-destructive"
      : tone === "fleur"
        ? "text-fleur"
        : "text-foreground";
}

// ————————————————————————————————————————————————————————————————
// 3) Opportunités — watchlist classée par marge/volume (lg, barres)
// ————————————————————————————————————————————————————————————————

export const marketMoversConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Critère", en: "Criterion" },
    type: "select",
    default: "marginPct",
    options: [
      { value: "marginPct", label: { fr: "Marge (%)", en: "Margin (%)" } },
      { value: "margin", label: { fr: "Marge (ISK)", en: "Margin (ISK)" } },
      { value: "spread", label: { fr: "Spread vente−achat", en: "Spread sell−buy" } },
      { value: "sellVolume", label: { fr: "Volume en vente", en: "Sell volume" } },
    ],
  },
  {
    key: "limit",
    label: { fr: "Barres max (0 = auto)", en: "Max bars (0 = auto)" },
    type: "number",
    default: 0,
  },
  {
    key: "maxFetch",
    label: { fr: "Types interrogés (charge ESI)", en: "Types queried (ESI load)" },
    type: "number",
    default: 16,
  },
];

export function MarketMoversWidget({ config }: WidgetProps) {
  const loc = useLocalized();
  const watchlist = useMarket((s) => s.watchlist);
  const metric = ((config.metric as string) || "marginPct") as Metric;
  const maxFetch = Math.max(1, Number(config.maxFetch) || 16);
  const ids = watchlist.slice(0, maxFetch);
  const quotes = useQuotes(ids);
  const names = useTypeNames(ids);

  if (!watchlist.length)
    return (
      <Hint text={loc({ fr: "Aucun favori — ajoute des objets au suivi", en: "No favorites — add tracked items" })} />
    );

  const rows = ids
    .map((id) => {
      const s = quotes[id];
      const v = s ? metricValue(s, metric) : null;
      return { id, name: names[id] ?? `#${id}`, v: v ?? 0, ready: v != null };
    })
    .filter((r) => r.ready)
    .sort((a, b) => b.v - a.v)
    .map((r) => ({
      label: r.name,
      value: r.v,
      display: metricFmt(metric, r.v),
      tone: metricTone(metric, r.v),
    }));

  if (!rows.length) return <Hint text="…" />;
  return <WidgetBars rows={rows} limit={Number(config.limit) || 0} />;
}

// ————————————————————————————————————————————————————————————————
// 4) Suivi — nombre de types favoris (sm)
// ————————————————————————————————————————————————————————————————

export const marketWatchlistConfig: WidgetField[] = [
  {
    key: "showScope",
    label: { fr: "Afficher la portée de marché", en: "Show market scope" },
    type: "toggle",
    default: true,
  },
];

export function MarketWatchlistWidget({ config }: WidgetProps) {
  const t = useT();
  const watchlist = useMarket((s) => s.watchlist);
  const scope = useMarket((s) => s.scope);
  const scopeLabel = SCOPES[scope as string]?.label;
  return (
    <WidgetStat
      value={String(watchlist.length)}
      sub={t("wg.market.watchlist")}
      tone={watchlist.length ? "fleur" : "default"}
      hint={config.showScope !== false ? scopeLabel : undefined}
    />
  );
}

// ————————————————————————————————————————————————————————————————
// 5) Grille d'icônes des favoris (md)
// ————————————————————————————————————————————————————————————————

export const marketWatchlistGridConfig: WidgetField[] = [
  {
    key: "iconSize",
    label: { fr: "Taille des icônes", en: "Icon size" },
    type: "select",
    default: "md",
    options: [
      { value: "sm", label: { fr: "Petite", en: "Small" } },
      { value: "md", label: { fr: "Moyenne", en: "Medium" } },
      { value: "lg", label: { fr: "Grande", en: "Large" } },
    ],
  },
];

const ICON_PX: Record<string, number> = { sm: 24, lg: 44, md: 32 };

export function MarketWatchlistGridWidget({ config }: WidgetProps) {
  const watchlist = useMarket((s) => s.watchlist);
  const { width, height } = useWidgetBox();
  const px = ICON_PX[(config.iconSize as string) || "md"] ?? 32;

  if (!watchlist.length)
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">—</div>
    );

  const cell = px + 6;
  const cols = width > 0 ? Math.max(1, Math.floor(width / cell)) : 6;
  const rows = height > 0 ? Math.max(1, Math.floor(height / cell)) : 3;
  const capacity = cols * rows;
  const overflow = watchlist.length > capacity;
  const shown = overflow ? watchlist.slice(0, capacity - 1) : watchlist;
  const hidden = watchlist.length - shown.length;

  return (
    <div className="flex h-full flex-wrap content-start gap-1.5 overflow-hidden">
      {shown.map((id) => (
        <img
          key={id}
          src={typeIconUrl(id, 32)}
          alt=""
          className="rounded bg-background"
          style={{ width: px, height: px }}
          loading="lazy"
        />
      ))}
      {overflow && (
        <span
          className="grid place-items-center rounded bg-muted text-[11px] tabular-nums text-muted-foreground"
          style={{ width: px, height: px }}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
