import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Copy,
  Download,
  GitCompare,
  RotateCw,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/core/i18n";
import { toast } from "@/core/toast";
import { cn } from "@/lib/utils";
import { usePiSetups, MAX_COMPARE } from "../store";
import { kpisForSetup, nextExpiry, type PiSetup } from "../lib/setup";
import { commodityName, PLANETS } from "../data/commodities";
import { fmtCountdown, fmtHours, fmtIsk, fmtNum } from "../lib/format";
import { downloadJson, exportSetupsJson, parseSetupsJson } from "../lib/io";
import { Kpi } from "./bits";

const planetName = (id: string) =>
  PLANETS.find((p) => p.id === id)?.name ?? id;

export function Portfolio() {
  const t = useT();
  const setups = usePiSetups((s) => s.setups);
  const compareIds = usePiSetups((s) => s.compareIds);
  const removeSetup = usePiSetups((s) => s.removeSetup);
  const toggleCompare = usePiSetups((s) => s.toggleCompare);
  const clearCompare = usePiSetups((s) => s.clearCompare);
  const importSetups = usePiSetups((s) => s.importSetups);
  const restartSetup = usePiSetups((s) => s.restartSetup);
  const fileRef = useRef<HTMLInputElement>(null);

  // Horloge live (planning de récolte) — re-render toutes les 30 s.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(h);
  }, []);

  async function shareSetup(s: PiSetup) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(s));
      toast.success(t("pi.pf.copied"), s.name);
    } catch {
      toast.error(t("pi.io.importError"));
    }
  }

  function onExport() {
    downloadJson(
      "eve-pi-setups.json",
      exportSetupsJson(setups, new Date().toISOString()),
    );
  }
  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = parseSetupsJson(await file.text());
      if (!parsed.length) {
        toast.error(t("pi.io.importError"));
        return;
      }
      const n = importSetups(parsed);
      toast.success(t("pi.io.imported", { n }));
    } catch {
      toast.error(t("pi.io.importError"));
    }
  }

  // KPIs par setup (mémoïsés sur la liste).
  const rows = useMemo(
    () => setups.map((s) => ({ setup: s, kpi: kpisForSetup(s) })),
    [setups],
  );

  const totalIsk = rows.reduce((a, r) => a + r.kpi.netIskPerHour, 0);
  const reprogPerDay = rows.reduce(
    (a, r) => a + (r.kpi.reprogramHours > 0 ? 24 / r.kpi.reprogramHours : 0),
    0,
  );
  // Capital total immobilisé sur l'ensemble des planètes/alts et retour sur
  // investissement global du portefeuille (jours pour rentabiliser le setup).
  const totalInvested = rows.reduce((a, r) => a + (r.setup.setupCostIsk || 0), 0);
  const paybackDays = totalIsk > 0 ? totalInvested / totalIsk / 24 : Infinity;

  // Planning de récolte : setups triés par échéance de programme.
  const harvest = useMemo(
    () => [...setups].sort((a, b) => nextExpiry(a) - nextExpiry(b)),
    [setups],
  );
  const overdueCount = harvest.filter((s) => nextExpiry(s) - now < 0).length;

  // Regroupement par alt (owner).
  const groups = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.setup.owner || "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const compareRows = compareIds
    .map((id) => rows.find((r) => r.setup.id === id))
    .filter(Boolean) as { setup: PiSetup; kpi: ReturnType<typeof kpisForSetup> }[];

  return (
    <div className="space-y-4">
      {/* Barre d'outils : export / import (.json) */}
      <div className="flex items-center justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImport}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> {t("pi.io.import")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={setups.length === 0}
        >
          <Download className="h-4 w-4" /> {t("pi.io.export")}
        </Button>
      </div>

      {setups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[40vh] items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {t("pi.pf.empty")}
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Agrégats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={t("pi.pf.totalIsk")} value={fmtIsk(totalIsk)} accent />
        <Kpi label={t("pi.pf.invested")} value={fmtIsk(totalInvested)} />
        <Kpi
          label={t("pi.pf.payback")}
          value={Number.isFinite(paybackDays) ? `${fmtNum(paybackDays)} ${t("pi.pf.days")}` : "—"}
        />
        <Kpi label={t("pi.pf.setups")} value={fmtNum(setups.length)} />
        <Kpi label={t("pi.pf.alts")} value={fmtNum(groups.length)} />
        <Kpi label={t("pi.pf.mgmt")} value={fmtNum(reprogPerDay)} />
      </div>

      {/* Planning de récolte */}
      <Card className={cn(overdueCount > 0 && "border-amber-500/40")}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-fleur" /> {t("pi.pf.harvest")}
          </CardTitle>
          {overdueCount > 0 && (
            <Badge variant="destructive">
              {t("pi.pf.overdue", { n: overdueCount })}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {harvest.map((s) => {
            const delta = nextExpiry(s) - now;
            const overdue = delta < 0;
            const soon = !overdue && delta < 2 * 3_600_000;
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm"
              >
                <span className="min-w-32 flex-1 truncate font-medium">
                  {s.owner ? (
                    <span className="text-muted-foreground">{s.owner} · </span>
                  ) : null}
                  {s.name}
                </span>
                <Badge
                  variant={overdue ? "destructive" : soon ? "fleur" : "muted"}
                  className="tabular-nums"
                >
                  {overdue ? t("pi.pf.overdueOne") : fmtCountdown(delta)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-fleur"
                  onClick={() => restartSetup(s.id)}
                  title={t("pi.pf.restart")}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => shareSetup(s)}
                  title={t("pi.pf.share")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Comparaison */}
      {compareRows.length > 0 && (
        <Card className="border-fleur/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitCompare className="h-4 w-4 text-fleur" /> {t("pi.pf.comparison")}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearCompare}>
              {t("pi.pf.clear")}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className="grid gap-2 text-sm"
              style={{
                gridTemplateColumns: `minmax(0,1.2fr) repeat(${compareRows.length}, minmax(0,1fr))`,
              }}
            >
              <CompareCell head />
              {compareRows.map((r) => (
                <CompareCell key={r.setup.id} head label={r.setup.name} />
              ))}

              <CompareRow
                label={t("pi.pf.product")}
                cells={compareRows.map((r) =>
                  r.setup.output === "p1"
                    ? commodityName(r.setup.rawId)
                    : planetName(r.setup.planet),
                )}
              />
              <CompareRow
                label={t("pi.res.netIsk")}
                cells={compareRows.map((r) => fmtIsk(r.kpi.netIskPerHour))}
                best={compareRows.map((r) => r.kpi.netIskPerHour)}
                bestHigh
              />
              <CompareRow
                label={t("pi.res.roi")}
                cells={compareRows.map((r) => fmtHours(r.kpi.roiHours))}
                best={compareRows.map((r) => r.kpi.roiHours)}
              />
              <CompareRow
                label={t("pi.res.output")}
                cells={compareRows.map(
                  (r) => `${fmtNum(r.kpi.outputPerHour)} ${t("pi.perHour")}`,
                )}
              />
              <CompareRow
                label={t("pi.pf.reprog")}
                cells={compareRows.map((r) => fmtHours(r.kpi.reprogramHours))}
                best={compareRows.map((r) => r.kpi.reprogramHours)}
                bestHigh
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setups groupés par alt */}
      {groups.map(([owner, list]) => (
        <Card key={owner || "_default"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {owner || t("pi.pf.noAlt")}
              <Badge variant="muted" className="ml-1">
                {list.length}
              </Badge>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-fleur" />
                {fmtIsk(list.reduce((a, r) => a + r.kpi.netIskPerHour, 0))}
                {" "}
                {t("pi.perHour")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {list.map(({ setup, kpi }) => {
              const checked = compareIds.includes(setup.id);
              const disabled = !checked && compareIds.length >= MAX_COMPARE;
              return (
                <div
                  key={setup.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm"
                >
                  <button
                    onClick={() => toggleCompare(setup.id)}
                    disabled={disabled}
                    title={t("pi.pf.compare")}
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded border text-[10px]",
                      checked
                        ? "border-transparent bg-fleur text-white"
                        : "border-border text-muted-foreground hover:border-foreground/40",
                      disabled && "opacity-40",
                    )}
                  >
                    {checked ? "✓" : ""}
                  </button>
                  <span className="min-w-32 flex-1 truncate font-medium">
                    {setup.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {planetName(setup.planet)}
                  </span>
                  <span className="tabular-nums text-fleur">
                    {fmtIsk(kpi.netIskPerHour)} {t("pi.perHour")}
                  </span>
                  <span className="hidden tabular-nums text-muted-foreground sm:inline">
                    ROI {fmtHours(kpi.roiHours)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSetup(setup.id)}
                    title={t("pi.layout.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
        </>
      )}
    </div>
  );
}

function CompareCell({ head, label }: { head?: boolean; label?: string }) {
  return (
    <div
      className={cn(
        "truncate px-1 py-1",
        head ? "text-xs font-semibold text-foreground" : "text-muted-foreground",
      )}
    >
      {label ?? ""}
    </div>
  );
}

function CompareRow({
  label,
  cells,
  best,
  bestHigh,
}: {
  label: string;
  cells: string[];
  best?: number[];
  bestHigh?: boolean;
}) {
  let bestIdx = -1;
  if (best && best.length) {
    const finite = best.map((v) => (Number.isFinite(v) ? v : bestHigh ? -Infinity : Infinity));
    const target = bestHigh ? Math.max(...finite) : Math.min(...finite);
    bestIdx = finite.indexOf(target);
  }
  return (
    <>
      <div className="px-1 py-1 text-xs text-muted-foreground">{label}</div>
      {cells.map((c, i) => (
        <div
          key={i}
          className={cn(
            "px-1 py-1 tabular-nums",
            i === bestIdx ? "font-semibold text-fleur" : "",
          )}
        >
          {c}
        </div>
      ))}
    </>
  );
}
