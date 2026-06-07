import {
  AlertTriangle,
  Battery,
  Crosshair,
  Gauge,
  Info,
  Rocket,
  Shield,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { typeRenderUrl } from "@/core/images";
import { useT } from "@/core/i18n";
import { DAMAGE_TYPES, type DamageType } from "../lib/attrs";
import type { Assumption, FitAnalysis, FitCheck, HullBonusNote, LayerTank } from "../lib/types";
import { fmtHp, fmtNum, fmtPct, fmtSec } from "../lib/format";

type T = (key: string, vars?: Record<string, string | number>) => string;

const DMG_COLOR: Record<DamageType, string> = {
  em: "bg-sky-500",
  th: "bg-rose-500",
  kin: "bg-zinc-400",
  exp: "bg-amber-500",
};

/** Joint et localise des notes de bonus de coque structurées. */
function formatNotes(notes: HullBonusNote[], t: T): string {
  return notes
    .map((n) => {
      if (n.type === "dps") return t("atelier.note.dps", { pct: n.pct, weapon: t("atelier.weapon.short." + n.weapon) });
      if (n.type === "resist") return t("atelier.note.resist", { pct: n.pct, layer: t("atelier.layer.short." + n.layer) });
      return t("atelier.note.hp", { pct: n.pct, layer: t("atelier.layer.short." + n.layer) });
    })
    .join(", ");
}

/** Localise une hypothèse (les notes de coque sont formatées séparément). */
function formatAssumption(s: Assumption, t: T): string {
  if (s.key === "hullBonus" && s.notes) return t("atelier.assumption.hullBonus", { notes: formatNotes(s.notes, t) });
  return t("atelier.assumption." + s.key, s.vars);
}

export function AnalysisView({ a, unresolved }: { a: FitAnalysis; unresolved: string[] }) {
  const t = useT();
  const DMG_LABEL: Record<DamageType, string> = {
    em: t("atelier.dmg.em"),
    th: t("atelier.dmg.th"),
    kin: t("atelier.dmg.kin"),
    exp: t("atelier.dmg.exp"),
  };
  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/40 p-4">
        <img
          src={typeRenderUrl(a.shipTypeId, 128)}
          alt=""
          className="h-20 w-20 rounded-lg border border-border/60 object-cover"
        />
        <div className="min-w-0">
          <div className="text-lg font-semibold">{a.shipName}</div>
          <div className="text-sm text-muted-foreground">{a.fitName}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {a.fitting.overflow ? (
              <Badge variant="destructive">{t("atelier.badge.notFitable")}</Badge>
            ) : (
              <Badge variant="success">{t("atelier.badge.montable")}</Badge>
            )}
            {a.cap.stable ? (
              <Badge variant="secondary">{t("atelier.badge.capStable", { pct: a.cap.stablePct?.toFixed(0) ?? "0" })}</Badge>
            ) : (
              <Badge variant="muted">{t("atelier.badge.cap", { time: fmtSec(a.cap.depletesIn ?? 0) })}</Badge>
            )}
          </div>
        </div>
        <div className="ml-auto flex gap-6">
          <HeadStat label={t("atelier.head.ehp")} value={fmtHp(a.tank.ehp)} accent="text-sky-400" />
          <HeadStat label={t("atelier.head.dps")} value={fmtNum(a.dps.total, 0)} accent="text-rose-400" />
          <HeadStat label={t("atelier.head.volley")} value={fmtHp(a.dps.volley)} />
        </div>
      </div>

      {unresolved.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t("atelier.unresolved", { list: unresolved.join(", ") })}
        </div>
      )}

      {/* Contrôles */}
      {a.checks.length > 0 && (
        <div className="space-y-1.5">
          {a.checks.map((c, i) => (
            <CheckRow key={i} c={c} t={t} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tank */}
        <Panel title={t("atelier.panel.tank")} icon={<Shield className="h-4 w-4" />}>
          <div className="space-y-3">
            <LayerRow name={t("atelier.layer.shield")} layer={a.tank.shield} tone="text-sky-400" labels={DMG_LABEL} t={t} />
            <LayerRow name={t("atelier.layer.armor")} layer={a.tank.armor} tone="text-amber-400" labels={DMG_LABEL} t={t} />
            <LayerRow name={t("atelier.layer.hull")} layer={a.tank.hull} tone="text-zinc-400" labels={DMG_LABEL} t={t} />
          </div>
        </Panel>

        {/* Condensateur */}
        <Panel title={t("atelier.panel.cap")} icon={<Battery className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("atelier.stat.capacity")} value={`${fmtNum(a.cap.capacity)} GJ`} />
            <Stat label={t("atelier.stat.recharge")} value={fmtSec(a.cap.rechargeTime)} />
            <Stat label={t("atelier.stat.peakRecharge")} value={`${a.cap.peakRecharge.toFixed(1)} GJ/s`} />
            <Stat label={t("atelier.stat.usage")} value={`${a.cap.usage.toFixed(1)} GJ/s`} />
            <div className="col-span-2">
              {a.cap.stable ? (
                <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                  {t("atelier.cap.stableAt", { pct: a.cap.stablePct?.toFixed(0) ?? "0" })}
                </div>
              ) : (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {t("atelier.cap.unstable", { time: fmtSec(a.cap.depletesIn ?? 0) })}
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* Navigation */}
        <Panel title={t("atelier.panel.nav")} icon={<Gauge className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("atelier.nav.maxVel")} value={`${fmtNum(a.nav.maxVelocity)} m/s`} />
            <Stat label={t("atelier.nav.alignTime")} value={fmtSec(a.nav.alignTime)} />
            <Stat label={t("atelier.nav.mass")} value={`${fmtNum(a.nav.mass / 1e6, 2)} M kg`} />
            <Stat label={t("atelier.nav.inertia")} value={fmtNum(a.nav.inertia, 3)} />
            <Stat label={t("atelier.nav.warpSpeed")} value={`${fmtNum(a.nav.warpSpeed, 1)} UA/s`} />
            <Stat label={t("atelier.nav.signature")} value={`${fmtNum(a.nav.signatureRadius)} m`} />
          </div>
        </Panel>

        {/* DPS */}
        <Panel title={t("atelier.panel.dps")} icon={<Crosshair className="h-4 w-4" />}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("atelier.dps.turrets")} value={fmtNum(a.dps.turret)} />
            <Stat label={t("atelier.dps.missiles")} value={fmtNum(a.dps.missile)} />
            <Stat label={t("atelier.dps.drones")} value={fmtNum(a.dps.drone)} />
          </div>
          <div className="mt-3 space-y-1.5">
            {DAMAGE_TYPES.map((d) => {
              const max = Math.max(...DAMAGE_TYPES.map((x) => a.dps.byType[x]), 1);
              return (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted-foreground">{DMG_LABEL[d]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                    <div className={cn("h-full rounded-full", DMG_COLOR[d])} style={{ width: `${(a.dps.byType[d] / max) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums">{fmtNum(a.dps.byType[d])}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Encombrement */}
        <Panel title={t("atelier.panel.fitting")} icon={<Wrench className="h-4 w-4" />} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <ResourceBar label={t("atelier.fit.cpu")} used={a.fitting.cpu.used} total={a.fitting.cpu.total} />
            <ResourceBar label={t("atelier.fit.grid")} used={a.fitting.pg.used} total={a.fitting.pg.total} />
            <ResourceBar label={t("atelier.fit.calibration")} used={a.fitting.calibration.used} total={a.fitting.calibration.total} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <SlotPill label={t("atelier.slot.high")} s={a.fitting.slots.high} />
            <SlotPill label={t("atelier.slot.mid")} s={a.fitting.slots.mid} />
            <SlotPill label={t("atelier.slot.low")} s={a.fitting.slots.low} />
            <SlotPill label={t("atelier.slot.rig")} s={a.fitting.slots.rig} />
            <SlotPill label={t("atelier.slot.turrets")} s={a.fitting.turrets} />
            <SlotPill label={t("atelier.slot.launchers")} s={a.fitting.launchers} />
            {a.fitting.drones.bandwidth > 0 && (
              <span className="rounded-md border border-border/60 bg-background/40 px-2 py-1">
                <Rocket className="mr-1 inline h-3 w-3" />
                {t("atelier.slot.drones", {
                  bw: fmtNum(a.fitting.drones.usedBandwidth),
                  maxBw: fmtNum(a.fitting.drones.bandwidth),
                  bay: fmtNum(a.fitting.drones.usedBay),
                  maxBay: fmtNum(a.fitting.drones.bay),
                })}
              </span>
            )}
          </div>
        </Panel>
      </div>

      {/* Hypothèses */}
      <div className="rounded-lg border border-border/60 bg-background/30 p-3 text-[11px] text-muted-foreground/80">
        <div className="mb-1 flex items-center gap-1 font-medium text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> {t("atelier.assumptions.calcTitle")}
        </div>
        <ul className="list-inside list-disc space-y-0.5">
          {a.assumptions.map((s, i) => (
            <li key={i}>{formatAssumption(s, t)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HeadStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/40 p-4", className)}>
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function LayerRow({
  name,
  layer,
  tone,
  labels,
  t,
}: {
  name: string;
  layer: LayerTank;
  tone: string;
  labels: Record<DamageType, string>;
  t: T;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={cn("text-sm font-medium", tone)}>{name}</span>
        <span className="text-xs text-muted-foreground">
          {fmtHp(layer.hp)} {t("atelier.unit.hp")} · <span className="font-medium text-foreground">{fmtHp(layer.ehp)}</span> {t("atelier.unit.ehp")}
        </span>
      </div>
      <div className="flex gap-1">
        {DAMAGE_TYPES.map((d) => (
          <div key={d} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div className={cn("h-full rounded-full", DMG_COLOR[d])} style={{ width: `${layer.resist[d] * 100}%` }} />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
              <span>{labels[d]}</span>
              <span className="tabular-nums">{fmtPct(layer.resist[d], 0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const over = used > total + 0.01;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("tabular-nums", over && "font-semibold text-destructive")}>
          {fmtNum(used, 1)} / {fmtNum(total, 0)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : pct > 90 ? "bg-amber-500" : "bg-success")}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function SlotPill({ label, s }: { label: string; s: { used: number; total: number } }) {
  const over = s.used > s.total;
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1",
        over ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border/60 bg-background/40",
      )}
    >
      {label} {s.used}/{s.total}
    </span>
  );
}

function CheckRow({ c, t }: { c: FitCheck; t: T }) {
  const map = {
    danger: { icon: <AlertTriangle className="h-4 w-4" />, cls: "border-destructive/40 bg-destructive/10 text-destructive" },
    warn: { icon: <AlertTriangle className="h-4 w-4" />, cls: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
    ok: { icon: <CheckCircle2 className="h-4 w-4" />, cls: "border-success/40 bg-success/10 text-success" },
    info: { icon: <Info className="h-4 w-4" />, cls: "border-border/60 bg-background/40 text-muted-foreground" },
  }[c.level];
  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", map.cls)}>
      <span className="mt-0.5 shrink-0">{map.icon}</span>
      <span>{t("atelier.check." + c.code, c.vars)}</span>
    </div>
  );
}
