import { useEffect, useState } from "react";
import { Loader2, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { useT } from "@/core/i18n";
import { useMarket } from "../store";
import { resolveTypeNames, fetchTypeInfo } from "../api";
import { CatalogTree } from "./CatalogTree";
import { MarketGroupTree } from "./MarketGroupTree";
import { secColorBtn } from "./bits";

export function Sidebar() {
  const t = useT();
  const { selectedTypeId, filters, watchlist, select, setFilters, resetFilters } =
    useMarket();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [catMode, setCatMode] = useState<"curated" | "full">("curated");

  /** Recherche libre : tente le catalogue, sinon résolution exacte ESI. */
  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(false);
    try {
      const res = await resolveTypeNames([q]);
      const hit = res.find((r) => r.name.toLowerCase() === q.toLowerCase()) ?? res[0];
      if (hit) {
        select(hit.id, hit.name);
        setSearchErr(false);
      } else {
        setSearchErr(true);
      }
    } catch {
      setSearchErr(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 border-r border-border bg-card/30 p-3">
      {/* Recherche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchErr(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder={t("market.search.placeholder")}
          spellCheck={false}
          className="pl-8 pr-8"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>
      {searchErr && (
        <p className="-mt-1.5 text-xs text-destructive">
          {t("market.search.noExact", { query })}
        </p>
      )}

      {/* Bouton filtres */}
      <Button
        variant={showFilters ? "secondary" : "outline"}
        size="sm"
        onClick={() => setShowFilters((s) => !s)}
        className="justify-center"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {showFilters ? t("market.filters.hide") : t("market.filters.show")}
      </Button>

      {showFilters && (
        <div className="space-y-3 rounded-lg border border-border/70 bg-background/40 p-3 text-sm">
          <Range
            label={t("market.filters.price")}
            min={filters.priceMin}
            max={filters.priceMax}
            onMin={(v) => setFilters({ priceMin: v })}
            onMax={(v) => setFilters({ priceMax: v })}
          />
          <Range
            label={t("market.filters.quantity")}
            min={filters.qtyMin}
            max={filters.qtyMax}
            onMin={(v) => setFilters({ qtyMin: v })}
            onMax={(v) => setFilters({ qtyMax: v })}
          />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{t("market.filters.security")}</div>
            <div className="flex gap-1.5">
              <SecToggle on={filters.high} kind="high" onClick={() => setFilters({ high: !filters.high })} />
              <SecToggle on={filters.low} kind="low" onClick={() => setFilters({ low: !filters.low })} />
              <SecToggle on={filters.null} kind="null" onClick={() => setFilters({ null: !filters.null })} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{t("market.filters.locationRegex")}</div>
            <Input
              value={filters.locationRegex}
              onChange={(e) => setFilters({ locationRegex: e.target.value })}
              placeholder={t("market.filters.locationPlaceholder")}
              spellCheck={false}
              className="h-8 text-xs"
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between text-xs">
            <span>{t("market.filters.npcOnly")}</span>
            <input
              type="checkbox"
              checked={filters.npcOnly}
              onChange={(e) => setFilters({ npcOnly: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
          </label>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full text-xs">
            {t("market.filters.reset")}
          </Button>
        </div>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Star className="h-3.5 w-3.5" /> {t("market.watchlist.title")}
          </div>
          {watchlist.map((id) => (
            <WatchRow key={id} id={id} active={id === selectedTypeId} onSelect={select} />
          ))}
        </div>
      )}

      {/* Bascule catalogue curé / marché complet */}
      <div className="flex rounded-md border border-border p-0.5">
        {(["curated", "full"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setCatMode(m)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              catMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "curated" ? t("market.catalog.curated") : t("market.catalog.full")}
          </button>
        ))}
      </div>

      {/* Catalogue */}
      <div className="-mr-1 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {catMode === "curated" ? (
          <CatalogTree query={query} onSelect={select} />
        ) : (
          <MarketGroupTree query={query} onSelect={select} />
        )}
      </div>
    </aside>
  );
}

function Range({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onMin: (v: number | null) => void;
  onMax: (v: number | null) => void;
}) {
  const t = useT();
  const parse = (s: string) => {
    const n = Number(s.replace(/\s/g, ""));
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5">
        <Input
          inputMode="numeric"
          value={min ?? ""}
          onChange={(e) => onMin(parse(e.target.value))}
          placeholder={t("market.range.min")}
          className="h-8 text-xs"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          inputMode="numeric"
          value={max ?? ""}
          onChange={(e) => onMax(parse(e.target.value))}
          placeholder={t("market.range.max")}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function SecToggle({
  on,
  kind,
  onClick,
}: {
  on: boolean;
  kind: "high" | "low" | "null";
  onClick: () => void;
}) {
  const label = kind === "high" ? "High" : kind === "low" ? "Low" : "Null";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        on ? secColorBtn(kind) : "border-border/60 text-muted-foreground/60 line-through",
      )}
    >
      {label}
    </button>
  );
}

function WatchRow({
  id,
  active,
  onSelect,
}: {
  id: number;
  active: boolean;
  onSelect: (id: number, name: string) => void;
}) {
  const [name, setName] = useState<string>(`#${id}`);
  useEffect(() => {
    let alive = true;
    void fetchTypeInfo(id).then((i) => alive && setName(i.name)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <button
      onClick={() => onSelect(id, name)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted/60",
        active && "bg-muted",
      )}
    >
      <img src={typeIconUrl(id, 32)} alt="" className="h-5 w-5 rounded" loading="lazy" />
      <span className="truncate">{name}</span>
    </button>
  );
}
