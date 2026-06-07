import { useEffect, useMemo, useState } from "react";
import { Telescope } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { useT } from "@/core/i18n";
import { baseAttrsOf, loadBaseNames, loadFamilies, tierPrices, type Family } from "../api";
import { compareTiers } from "../lib/score";
import { fmtIsk, fmtVal } from "../lib/format";

/** Palette par tier (index dans la famille) — couleurs distinctes. */
const PALETTE = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function ExploreView() {
  const t = useT();
  const [families, setFamilies] = useState<Family[]>([]);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [prices, setPrices] = useState<Map<number, number>>(new Map());
  const [baseNames, setBaseNames] = useState<Map<number, string>>(new Map());
  const [baseId, setBaseId] = useState<number | null>(null);
  const [baseAttrs, setBaseAttrs] = useState<Record<number, number> | null>(null);
  const [loadingFam, setLoadingFam] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; tier: string; text: string; color: string } | null>(null);

  useEffect(() => {
    let alive = true;
    loadFamilies()
      .then((f) => alive && (setFamilies(f), setLoadingFam(false)))
      .catch(() => alive && setLoadingFam(false));
    return () => {
      alive = false;
    };
  }, []);

  function pick(name: string) {
    setQuery(name);
    const f = families.find((x) => x.resultName.toLowerCase() === name.toLowerCase()) ?? null;
    setFamily(f);
    setBaseId(null);
    setBaseAttrs(null);
    setPrices(new Map());
    setBaseNames(new Map());
    if (f) {
      void tierPrices(f.tiers.map((t) => t.id)).then((p) => setPrices(p));
      void loadBaseNames(f.bases).then((nm) => setBaseNames(nm));
    }
  }

  function pickBase(v: string) {
    if (v === "mult") {
      setBaseId(null);
      setBaseAttrs(null);
      return;
    }
    const id = Number(v);
    setBaseId(id);
    setBaseAttrs(null);
    void baseAttrsOf(id).then((a) => setBaseAttrs(a));
  }

  const rows = useMemo(
    () => (family ? compareTiers(family.tiers, baseAttrs ?? undefined) : []),
    [family, baseAttrs],
  );
  const abs = baseAttrs != null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t("abyssal.explore.module")} {loadingFam ? t("abyssal.explore.loading") : t("abyssal.explore.families", { n: families.length })}
            </span>
            <Input
              value={query}
              onChange={(e) => pick(e.target.value)}
              placeholder={t("abyssal.explore.placeholder")}
              list="family-list"
              spellCheck={false}
              disabled={loadingFam}
            />
            <datalist id="family-list">
              {families.map((f) => (
                <option key={f.resultId} value={f.resultName} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("abyssal.explore.values")}</span>
            <Select value={baseId != null ? String(baseId) : "mult"} onValueChange={pickBase} disabled={!family}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mult">{t("abyssal.explore.multipliers")}</SelectItem>
                {family?.bases.map((b) => (
                  <SelectItem key={b} value={String(b)}>
                    {baseNames.get(b) ?? `#${b}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {family && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <img src={typeIconUrl(family.resultId, 32)} alt="" className="h-7 w-7 rounded" />
            <span className="text-sm font-semibold">{family.resultName}</span>
          </div>
        )}
      </div>

      {!family ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
          <Telescope className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          {t("abyssal.explore.empty")}
        </div>
      ) : (
        <>
          {/* Légende des tiers : couleur, prix, amplitude */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {family.tiers.map((tier, i) => {
              const spans = Object.values(tier.attrs).map(([min, max]) => max - min);
              const avgSpan = spans.length ? spans.reduce((s, x) => s + x, 0) / spans.length : 0;
              const price = prices.get(tier.id) ?? 0;
              return (
                <div key={tier.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", PALETTE[i % PALETTE.length])} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{tier.tier}</div>
                    <div className="text-[11px] text-muted-foreground">{t("abyssal.explore.amplitude", { pct: (avgSpan / 2 * 100).toFixed(0) })}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    {price > 0 ? `${fmtIsk(price)} ISK` : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparaison par attribut */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">{t("abyssal.explore.rangesByAttr")}</span>
              <span className="text-[11px] text-muted-foreground">{abs ? t("abyssal.explore.absolute") : t("abyssal.explore.multBase")}</span>
            </div>
            <div className="space-y-4">
              {rows.map((row) => {
                const span = row.domainMax - row.domainMin || 1;
                const pos = (v: number) => ((v - row.domainMin) / span) * 100;
                const fmt = (v: number) => (abs ? fmtVal(v) : "×" + v.toFixed(2));
                const worstFirst = row.high; // si highIsGood, le bon côté est à droite
                return (
                  <div key={row.attrId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {row.name}
                        <span className="ml-1 text-[10px] text-muted-foreground">{row.high ? t("abyssal.explore.higherBetter") : t("abyssal.explore.lowerBetter")}</span>
                      </span>
                      {abs && row.base != null && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">{t("abyssal.explore.base", { n: fmtVal(row.base) })}</span>
                      )}
                    </div>
                    <div className="relative rounded-md bg-muted/30" style={{ height: family.tiers.length * 18 + 8 }}>
                      {/* Zone « meilleure » (ombrée) */}
                      <div
                        className={cn("absolute inset-y-0 bg-success/5")}
                        style={
                          worstFirst
                            ? { left: `${pos(row.baseMark)}%`, right: 0 }
                            : { left: 0, right: `${100 - pos(row.baseMark)}%` }
                        }
                      />
                      {/* Marqueur base */}
                      <div className="absolute inset-y-0 z-10 w-px bg-foreground/50" style={{ left: `${pos(row.baseMark)}%` }} />
                      {/* Une zone de survol pleine largeur par tier (facile à viser) */}
                      {family.tiers.map((tier, i) => {
                        const bar = row.bars.find((b) => b.tierId === tier.id);
                        if (!bar) return null;
                        const left = pos(bar.min);
                        const width = Math.max(1.5, pos(bar.max) - left);
                        const color = PALETTE[i % PALETTE.length];
                        const text = `${fmt(bar.min)} – ${fmt(bar.max)}`;
                        return (
                          <div
                            key={tier.id}
                            className="group absolute inset-x-0 cursor-help"
                            style={{ top: i * 18 + 4, height: 16 }}
                            onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, tier: tier.tier, text, color })}
                            onMouseLeave={() => setTip(null)}
                          >
                            <div
                              className={cn(
                                "absolute top-1.5 h-3 rounded-full opacity-90 ring-0 transition-all group-hover:opacity-100 group-hover:ring-2 group-hover:ring-foreground/30",
                                color,
                              )}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                      <span>{fmt(row.domainMin)}</span>
                      <span>{t("abyssal.explore.base", { n: abs ? fmtVal(row.baseMark) : "1×" })}</span>
                      <span>{fmt(row.domainMax)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              {t("abyssal.explore.footnote")}
            </p>
          </div>
        </>
      )}

      {tip && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", tip.color)} />
          <span className="font-medium">{tip.tier}</span>
          <span className="tabular-nums text-muted-foreground">{tip.text}</span>
        </div>
      )}
    </div>
  );
}
