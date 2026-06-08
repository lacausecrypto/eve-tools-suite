import { useMemo, useState } from "react";
import {
  Boxes,
  Download,
  Factory,
  Gauge,
  LoaderCircle,
  Save,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import {
  PLANETS,
  commodityName,
  p1FromRaw,
  p2UsingP1,
  rawsForPlanet,
  type PlanetType,
} from "../data/commodities";
import { CYCLE_TIMES, MAX_HEADS, cyclesForDuration } from "../lib/extractor";
import { balancedFactories, simulate, type OutputChoice } from "../lib/simulate";
import { fmtHours, fmtIsk, fmtNum } from "../lib/format";
import { usePiSetups } from "../store";
import type { ExtractionConfig } from "../lib/setup";
import { jitaSell } from "../lib/prices";
import { buildCcpTemplate } from "../lib/template";
import { downloadJson } from "../lib/io";
import { toast } from "@/core/toast";
import { Field, Kpi, Stat, numField } from "./bits";

/** Mode « Extraction » : simulation mono-planète avec decay temporel. */
export function ExtractionSim() {
  const t = useT();

  const [planet, setPlanet] = useState<PlanetType | null>(null);
  const [rawId, setRawId] = useState<string | null>(null);
  const [heads, setHeads] = useState(8);
  const [cycleSec, setCycleSec] = useState(3600);
  const [durationHours, setDurationHours] = useState(24);
  const [qtyPerCycle, setQtyPerCycle] = useState(1500);
  const [p1Factories, setP1Factories] = useState(0);
  const [output, setOutput] = useState<OutputChoice>("raw");
  const [price, setPrice] = useState(100);
  const [pocoTaxPct, setPocoTaxPct] = useState(10);
  const [setupCostIsk, setSetupCostIsk] = useState(8_000_000);

  // --- Setups (enregistrer / charger) ---
  const setups = usePiSetups((s) => s.setups);
  const saveSetup = usePiSetups((s) => s.saveSetup);
  const [setupName, setSetupName] = useState("");
  const [setupOwner, setSetupOwner] = useState("");

  const currentConfig = (): ExtractionConfig => ({
    planet: planet ?? "temperate",
    rawId: rawId ?? "",
    heads,
    cycleSec,
    durationHours,
    qtyPerCycle,
    p1Factories,
    output,
    price,
    pocoTaxPct,
    setupCostIsk,
  });

  function onSave() {
    if (!rawId) return;
    saveSetup(setupName || commodityName(rawId), setupOwner, currentConfig());
    toast.success(t("pi.setup.saved"), setupName || commodityName(rawId));
    setSetupName("");
  }

  const [ccpLoading, setCcpLoading] = useState(false);
  async function exportCcp() {
    if (!rawId) return;
    setCcpLoading(true);
    try {
      const tpl = await buildCcpTemplate(currentConfig(), 5);
      downloadJson(`PI - ${tpl.Cmt}.json`, JSON.stringify(tpl));
      toast.success(t("pi.ccp.exported"), t("pi.ccp.hint"));
    } catch (e) {
      toast.error(t("pi.ccp.error"), String(e));
    } finally {
      setCcpLoading(false);
    }
  }

  function loadSetup(id: string) {
    const s = setups.find((x) => x.id === id);
    if (!s) return;
    setPlanet(s.planet);
    setRawId(s.rawId);
    setHeads(s.heads);
    setCycleSec(s.cycleSec);
    setDurationHours(s.durationHours);
    setQtyPerCycle(s.qtyPerCycle);
    setP1Factories(s.p1Factories);
    setOutput(s.output);
    setPrice(s.price);
    setPocoTaxPct(s.pocoTaxPct);
    setSetupCostIsk(s.setupCostIsk);
    setSetupOwner(s.owner);
  }

  const raws = useMemo(() => (planet ? rawsForPlanet(planet) : []), [planet]);
  const p1 = useMemo(() => (rawId ? p1FromRaw(rawId) : undefined), [rawId]);
  const p2list = useMemo(() => (p1 ? p2UsingP1(p1.id) : []), [p1]);

  const totalCycles = cyclesForDuration(cycleSec, durationHours || 1);

  const sim = useMemo(() => {
    if (!rawId) return null;
    return simulate({
      qtyPerCycle: qtyPerCycle || 0,
      cycleSec,
      totalCycles,
      heads,
      p1Factories,
      output,
      price: price || 0,
      pocoTaxPct: pocoTaxPct || 0,
      setupCostIsk: setupCostIsk || 0,
    });
  }, [
    rawId,
    qtyPerCycle,
    cycleSec,
    totalCycles,
    heads,
    p1Factories,
    output,
    price,
    pocoTaxPct,
    setupCostIsk,
  ]);

  function pickPlanet(p: PlanetType) {
    setPlanet(p);
    setRawId(null);
  }

  function balance() {
    if (!sim) return;
    setP1Factories(balancedFactories(sim.extractionPerHour));
    setOutput("p1");
  }

  // Prix Jita live (ESI) de la marchandise vendue.
  const soldName =
    output === "p1" ? p1?.name : rawId ? commodityName(rawId) : undefined;
  const [pxLoading, setPxLoading] = useState(false);
  async function fetchJita() {
    if (!soldName) return;
    setPxLoading(true);
    try {
      const v = await jitaSell(soldName);
      if (v != null) setPrice(Math.round(v));
      else toast.info(t("pi.px.none"), soldName);
    } catch (e) {
      toast.error(t("pi.px.error"), String(e));
    } finally {
      setPxLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ----- Configuration ----- */}
      <div className="space-y-4">
        {/* Setups : enregistrer / charger */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Save className="h-4 w-4 text-fleur" /> {t("pi.setup.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex gap-2">
              <Input
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder={t("pi.setup.name")}
                className="h-8"
              />
              <Input
                value={setupOwner}
                onChange={(e) => setSetupOwner(e.target.value)}
                placeholder={t("pi.setup.owner")}
                className="h-8 w-28"
                list="pi-owners"
              />
              <datalist id="pi-owners">
                {[...new Set(setups.map((s) => s.owner).filter(Boolean))].map(
                  (o) => (
                    <option key={o} value={o} />
                  ),
                )}
              </datalist>
              <Button size="sm" onClick={onSave} disabled={!rawId}>
                {t("pi.setup.save")}
              </Button>
            </div>
            {setups.length > 0 && (
              <Select value="" onValueChange={loadSetup}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={t("pi.setup.load")} />
                </SelectTrigger>
                <SelectContent>
                  {setups.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.owner ? `${s.owner} · ` : ""}
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={exportCcp}
              disabled={!rawId || ccpLoading}
              title={t("pi.ccp.hint")}
            >
              {ccpLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("pi.ccp.export")}
            </Button>
          </CardContent>
        </Card>

        {/* Planète */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Boxes className="h-4 w-4 text-fleur" /> {t("pi.planet")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div data-tour="pi.planet" className="grid grid-cols-4 gap-2">
              {PLANETS.map((p) => {
                const active = planet === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => pickPlanet(p.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      active
                        ? "border-transparent text-white"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40",
                    )}
                    style={active ? { background: `hsl(${p.accent})` } : undefined}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {planet && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">
                  {t("pi.raw")}
                </label>
                <Select value={rawId ?? ""} onValueChange={setRawId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("pi.raw.pick")} />
                  </SelectTrigger>
                  <SelectContent>
                    {raws.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {p1 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {commodityName(rawId!)} →{" "}
                    <span className="text-foreground">{p1.name}</span>{" "}
                    <Badge variant="muted" className="ml-1">
                      P1
                    </Badge>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracteur */}
        <Card className={cn(!rawId && "pointer-events-none opacity-50")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-fleur" /> {t("pi.extractor")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Field label={`${t("pi.heads")} · ${heads}`}>
              <input
                type="range"
                data-tour="pi.heads" className="eve-slider"
                min={1}
                max={MAX_HEADS}
                value={heads}
                onChange={(e) => setHeads(parseInt(e.target.value, 10))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("pi.cycle")}>
                <Select
                  value={String(cycleSec)}
                  onValueChange={(v) => setCycleSec(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_TIMES.map((c) => (
                      <SelectItem key={c.sec} value={String(c.sec)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`${t("pi.program")} (h)`}>
                <Input
                  type="number"
                  inputMode="numeric"
                  {...numField(durationHours, setDurationHours, 1)}
                />
              </Field>
            </div>
            <Field label={t("pi.qtyPerCycle")} hint={t("pi.qtyPerCycle.hint")}>
              <Input
                type="number"
                inputMode="numeric"
                {...numField(qtyPerCycle, setQtyPerCycle, 0)}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              {t("pi.program.cycles", { n: totalCycles })} ·{" "}
              {fmtHours(durationHours || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Économie */}
        <Card className={cn(!rawId && "pointer-events-none opacity-50")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Factory className="h-4 w-4 text-fleur" /> {t("pi.factories")} & ISK
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-end gap-2">
              <Field label={t("pi.factories")} className="flex-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  {...numField(p1Factories, setP1Factories, 0)}
                />
              </Field>
              <Button variant="outline" size="sm" onClick={balance}>
                <Scale className="h-4 w-4" /> {t("pi.balance")}
              </Button>
            </div>

            <Field label={t("pi.output")}>
              <Select
                value={output}
                onValueChange={(v) => setOutput(v as OutputChoice)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">{t("pi.output.raw")}</SelectItem>
                  <SelectItem value="p1">
                    {t("pi.output.p1")}
                    {p1 ? ` — ${p1.name}` : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("pi.price")}>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    inputMode="decimal"
                    {...numField(price, setPrice, 0)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 px-2"
                    onClick={fetchJita}
                    disabled={!soldName || pxLoading}
                    title={t("pi.px.fetch")}
                  >
                    {pxLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      "Jita"
                    )}
                  </Button>
                </div>
              </Field>
              <Field label={t("pi.tax")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  {...numField(pocoTaxPct, setPocoTaxPct, 0)}
                />
              </Field>
            </div>
            <Field label={t("pi.setupCost")}>
              <Input
                type="number"
                inputMode="numeric"
                {...numField(setupCostIsk, setSetupCostIsk, 0)}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* ----- Résultats ----- */}
      <div className="space-y-4">
        {sim ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label={t("pi.res.netIsk")}
                value={fmtIsk(sim.netIskPerHour)}
                accent
              />
              <Kpi
                label={t("pi.res.output")}
                value={`${fmtNum(sim.outputPerHour)} ${t("pi.perHour")}`}
              />
              <Kpi
                label={t("pi.res.extraction")}
                value={`${fmtNum(sim.extractionPerHour)} ${t("pi.perHour")}`}
              />
              <Kpi label={t("pi.res.roi")} value={fmtHours(sim.roiHours)} />
            </div>

            <YieldChart
              perCycle={sim.program.perCycle}
              title={t("pi.chart.title")}
            />

            <Card>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm sm:grid-cols-4">
                <Stat label={t("pi.chart.total")} value={fmtNum(sim.program.total)} />
                <Stat
                  label={t("pi.chart.avg")}
                  value={fmtNum(sim.program.unitsPerHour)}
                />
                <Stat
                  label={t("pi.chart.duration")}
                  value={fmtHours(sim.program.durationHours)}
                />
                <Stat label={t("pi.chart.peak")} value={fmtNum(sim.program.peak)} />
                <Stat
                  label={t("pi.chart.decay")}
                  value={`${sim.program.decayPct.toFixed(0)} %`}
                />
                <Stat
                  label={t("pi.res.grossIsk")}
                  value={fmtIsk(sim.grossIskPerHour)}
                />
                <Stat
                  label={t("pi.res.utilization")}
                  value={
                    p1Factories > 0
                      ? `${(sim.utilization * 100).toFixed(0)} %`
                      : "—"
                  }
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {t("pi.factories")}
                  </span>
                  <BalanceBadge balance={sim.rawBalancePerHour} t={t} />
                </div>
              </CardContent>
            </Card>

            {p2list.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-fleur" /> {t("pi.feeds")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5 pt-0">
                  {p2list.map((c) => (
                    <Badge key={c.id} variant="outline">
                      {c.name}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[40vh] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("pi.empty")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BalanceBadge({
  balance,
  t,
}: {
  balance: number;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  if (Math.abs(balance) < 1)
    return (
      <Badge variant="success" className="w-fit">
        {t("pi.res.balance.ok")}
      </Badge>
    );
  if (balance > 0)
    return (
      <Badge variant="muted" className="w-fit">
        {t("pi.res.balance.surplus", { n: fmtNum(balance) })}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="w-fit">
      {t("pi.res.balance.deficit", { n: fmtNum(-balance) })}
    </Badge>
  );
}

/** Visualisation SVG de la courbe de rendement par cycle (killer feature). */
function YieldChart({ perCycle, title }: { perCycle: number[]; title: string }) {
  const W = 560;
  const H = 150;
  const pad = 4;
  const n = perCycle.length;
  const max = Math.max(1, ...perCycle);
  const bw = (W - pad * 2) / Math.max(1, n);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-36 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={title}
        >
          {perCycle.map((v, i) => {
            const h = (v / max) * (H - pad * 2);
            return (
              <rect
                key={i}
                x={pad + i * bw}
                y={H - pad - h}
                width={Math.max(0.5, bw - 0.6)}
                height={h}
                rx={0.5}
                className="fill-fleur"
                opacity={0.55 + 0.45 * (v / max)}
              />
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
