import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Loader2,
  Route as RouteIcon,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { typeIconUrl } from "@/core/images";
import { useTrade, haulItemKey, type SavedHaul } from "../store";
import { hubPairJumps } from "../run";
import { planHaul, SHIP_PRESETS } from "../lib/haul";
import { fmtIsk, fmtQty } from "../lib/format";
import { NumField } from "./bits";

export function RoutePlanner() {
  const t = useT();
  const {
    haulItems,
    haulShipId,
    haulCargo,
    haulSecure,
    savedHauls,
    removeHaulItem,
    clearHaul,
    setHaulConfig,
    saveHaul,
    removeSavedHaul,
    loadSavedHaul,
  } = useTrade();

  const [jumpMap, setJumpMap] = useState<Map<string, number | null> | null>(null);
  const [loadingJumps, setLoadingJumps] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingJumps(true);
    hubPairJumps(haulSecure)
      .then((m) => alive && (setJumpMap(m), setLoadingJumps(false)))
      .catch(() => alive && (setJumpMap(null), setLoadingJumps(false)));
    return () => {
      alive = false;
    };
  }, [haulSecure]);

  const plan = useMemo(
    () => planHaul(haulItems, haulCargo, (a, b) => jumpMap?.get(`${a}>${b}`) ?? null, "forge"),
    [haulItems, haulCargo, jumpMap],
  );

  function pickShip(id: string) {
    const p = SHIP_PRESETS.find((s) => s.id === id);
    setHaulConfig({ haulShipId: id, ...(p ? { haulCargo: p.cargo } : {}) });
  }

  function save() {
    saveHaul(saveName, {
      profit: plan.totals.profit,
      volume: plan.totals.volume,
      trips: plan.totals.trips,
      totalJumps: plan.totals.totalJumps,
    });
    setSaveName("");
  }

  const tot = plan.totals;
  const empty = haulItems.length === 0;

  return (
    <div className="space-y-4">
      {/* Configuration transport */}
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("trade.route.ship")}</span>
            <Select value={haulShipId} onValueChange={pickShip}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHIP_PRESETS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <img src={typeIconUrl(s.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 shrink-0 rounded" />
                      <span>{s.label} · {fmtQty(s.cargo)} m³</span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 shrink-0 rounded bg-muted" />
                    <span>{t("trade.route.custom")}</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <NumField
            label={t("trade.route.cargo")}
            value={haulCargo}
            onChange={(v) => setHaulConfig({ haulCargo: v ?? 0, haulShipId: "custom" })}
          />
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("trade.route.security")}</span>
            <button
              onClick={() => setHaulConfig({ haulSecure: !haulSecure })}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors",
                haulSecure
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {haulSecure ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
              {haulSecure ? t("trade.route.safe") : t("trade.route.risky")}
            </button>
          </label>
          <div className="flex items-end">
            {loadingJumps ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("trade.route.computing")}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/70">
                {t("trade.route.cargoHint")}
              </span>
            )}
          </div>
        </div>
      </div>

      {empty ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-10 text-center text-sm text-muted-foreground">
          <Truck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          {t("trade.route.emptyLead")}<strong>{t("trade.route.emptyArbitrage")}</strong>{t("trade.route.emptyThen")}
          <strong>{t("trade.route.emptyPlan")}</strong>{t("trade.route.emptyTail")}
        </div>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Kpi label={t("trade.route.kpi.volume")} value={`${fmtQty(tot.volume)} m³`} icon={<Boxes className="h-3.5 w-3.5" />} />
            <Kpi label={t("trade.route.kpi.trips")} value={String(tot.trips)} icon={<Truck className="h-3.5 w-3.5" />} />
            <Kpi label={t("trade.route.kpi.jumps")} value={String(tot.totalJumps)} sub={t("trade.route.kpi.jumpsSub", { laden: tot.ladenJumps, empty: tot.emptyJumps })} icon={<RouteIcon className="h-3.5 w-3.5" />} />
            <Kpi label={t("trade.route.kpi.netProfit")} value={fmtIsk(tot.profit)} accent="text-success" />
            <Kpi label={t("trade.route.kpi.collateral")} value={fmtIsk(tot.buyCost)} sub={t("trade.route.kpi.collateralSub")} />
            <Kpi label={t("trade.route.kpi.iskPerM3")} value={fmtIsk(tot.iskPerM3)} />
            <Kpi label={t("trade.route.kpi.iskPerJump")} value={fmtIsk(tot.iskPerJump)} />
          </div>

          {/* Sauvegarde */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={t("trade.route.savePlaceholder")}
              className="h-9 max-w-xs"
            />
            <Button size="sm" onClick={save}>
              <Save className="h-4 w-4" /> {t("trade.route.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearHaul} className="ml-auto">
              <X className="h-4 w-4" /> {t("trade.route.clear")}
            </Button>
          </div>

          {/* Segments ordonnés */}
          <div className="space-y-3">
            {plan.segments.map((seg, i) => (
              <div key={seg.key} className="rounded-xl border border-border bg-card/40 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{t("trade.route.step", { n: i + 1 })}</Badge>
                  <span className="font-medium">{seg.srcLabel}</span>
                  <RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{seg.dstLabel}</span>
                  {seg.jumps != null && (
                    <span className="text-xs text-muted-foreground">{t("trade.route.jumpsEach", { n: seg.jumps })}</span>
                  )}
                  {seg.repositionJumps != null && seg.repositionJumps > 0 && (
                    <span className="text-xs text-muted-foreground/70">{t("trade.route.reposition", { n: seg.repositionJumps })}</span>
                  )}
                  <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span><span className="font-medium text-foreground">{fmtQty(seg.volume)}</span> m³</span>
                    <span>{t("trade.route.trips", { n: seg.trips })}</span>
                    <span className="text-success">{fmtIsk(seg.profit)}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {seg.items.map((it) => (
                    <div key={haulItemKey(it)} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/40">
                      <img src={typeIconUrl(it.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                      <span className="min-w-0 flex-1 truncate">{it.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmtQty(it.qty)} ×</span>
                      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{fmtQty(it.qty * it.unitVolume)} m³</span>
                      <span className="w-24 shrink-0 text-right text-xs text-success tabular-nums">{fmtIsk(it.profit)}</span>
                      <button onClick={() => removeHaulItem(haulItemKey(it))} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Historique */}
      {savedHauls.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="mb-2 text-sm font-semibold">{t("trade.route.history")}</div>
          <div className="space-y-1.5">
            {savedHauls.map((h) => (
              <SavedRow key={h.id} haul={h} onLoad={() => loadSavedHaul(h.id)} onRemove={() => removeSavedHaul(h.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", accent)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

function SavedRow({
  haul,
  onLoad,
  onRemove,
}: {
  haul: SavedHaul;
  onLoad: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const date = new Date(haul.createdAt).toLocaleDateString();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm">
      <span className="font-medium">{haul.name}</span>
      <span className="text-xs text-muted-foreground">{date}</span>
      <Badge variant="muted">{t("trade.route.savedItems", { n: haul.items.length })}</Badge>
      <div className="ml-auto flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
        <span>{fmtQty(haul.summary.volume)} m³</span>
        <span>{t("trade.route.savedTrips", { n: haul.summary.trips })}</span>
        <span>{t("trade.route.savedJumps", { n: haul.summary.totalJumps })}</span>
        <span className="text-success">{fmtIsk(haul.summary.profit)}</span>
        <Button size="sm" variant="outline" onClick={onLoad}>{t("trade.route.load")}</Button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
