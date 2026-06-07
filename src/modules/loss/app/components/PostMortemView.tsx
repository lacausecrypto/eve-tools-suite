import { ExternalLink, Skull, Swords, Users } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import {
  allianceLogoUrl,
  corpLogoUrl,
  portraitUrl,
  typeIconUrl,
  typeRenderUrl,
} from "@/core/images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GangClass, PostMortem } from "../api";
import { formatIsk } from "../lib/digest";
import { openExternal, zkillKillUrl } from "../lib/external";
import { AttackerList } from "./AttackerList";
import { FitColumns } from "./FitColumns";
import { Verdict } from "./Verdict";

const GANG_TONE: Record<GangClass, string> = {
  solo: "success",
  small_gang: "default",
  fleet: "secondary",
  blob: "destructive",
  npc: "muted",
};

/** Format killmail time as `YYYY-MM-DD HH:MM` in EVE time (UTC). */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())}`;
}

export function PostMortemView({ pm }: { pm: PostMortem }) {
  const t = useT();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ───────── En-tête : victime ───────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <img
            src={pm.ship_type_id ? typeRenderUrl(pm.ship_type_id, 256) : ""}
            alt={pm.ship_name ?? ""}
            className="h-28 w-28 shrink-0 rounded-lg bg-background/40 object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Skull className="h-3.5 w-3.5" />
              {t("loss.header.lost")}
            </div>
            <h2 className="truncate text-xl font-bold">{pm.ship_name ?? t("loss.header.ship")}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {pm.victim_character_id && (
                <span className="inline-flex items-center gap-1.5">
                  <img
                    src={portraitUrl(pm.victim_character_id, 32)}
                    alt=""
                    className="h-5 w-5 rounded"
                  />
                  {pm.victim_character_name ?? `#${pm.victim_character_id}`}
                </span>
              )}
              {pm.victim_corporation_name && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  {pm.victim_corporation_id != null && (
                    <img src={corpLogoUrl(pm.victim_corporation_id, 32)} alt="" className="h-4 w-4 rounded" />
                  )}
                  {pm.victim_corporation_name}
                </span>
              )}
              {pm.victim_alliance_name && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  {pm.victim_alliance_id != null && (
                    <img src={allianceLogoUrl(pm.victim_alliance_id, 32)} alt="" className="h-4 w-4 rounded" />
                  )}
                  {pm.victim_alliance_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="text-sm font-medium">{pm.system_name ?? t("loss.header.unknownSystem")}</span>
            <span className="text-xs text-muted-foreground">{fmtTime(pm.killmail_time)} EVE</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => openExternal(zkillKillUrl(pm.killmail_id))}
            >
              <ExternalLink className="h-4 w-4" />
              zKillboard
            </Button>
          </div>
        </div>

        {/* Stats clés */}
        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          <Stat label={t("loss.stat.value")} value={`${formatIsk(pm.total_value)} ISK`} />
          <Stat label={t("loss.stat.damage")} value={pm.damage_taken.toLocaleString()} />
          <Stat label={t("loss.stat.attackers")} value={String(pm.attacker_count)} />
          <div className="flex flex-col items-center justify-center gap-1 bg-card p-3">
            <Badge variant={GANG_TONE[pm.gang_class] as never}>{t(`loss.gang.${pm.gang_class}`)}</Badge>
            <span className="text-xs text-muted-foreground">{t("loss.stat.gang")}</span>
          </div>
        </div>
      </div>

      {/* ───────── Valeur ISK : détruit vs droppé ───────── */}
      <Section icon={<Swords className="h-4 w-4" />} title={t("loss.section.value")}>
        <ValueBar pm={pm} />
      </Section>

      {/* ───────── Qui t'a tué + composition ───────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section icon={<Swords className="h-4 w-4" />} title={t("loss.section.attackers")}>
            <AttackerList attackers={pm.top_damage} />
          </Section>
        </div>
        <Section icon={<Users className="h-4 w-4" />} title={t("loss.section.composition")}>
          <Breakdown pm={pm} />
        </Section>
      </div>

      {/* ───────── Fit reconstruit ───────── */}
      <Section title={t("loss.section.fit")}>
        <FitColumns fit={pm.fit} />
      </Section>

      {/* ───────── Verdict ───────── */}
      <Section title={t("loss.section.verdict")}>
        <Verdict pm={pm} />
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 bg-card p-3">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ValueBar({ pm }: { pm: PostMortem }) {
  const t = useT();
  const total = pm.total_value || pm.destroyed_value + pm.dropped_value;
  const destroyedPct = total > 0 ? (pm.destroyed_value / total) * 100 : 100;
  const droppedPct = total > 0 ? (pm.dropped_value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-destructive" style={{ width: `${destroyedPct}%` }} />
        <div className="h-full bg-success" style={{ width: `${droppedPct}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
        <span className="text-destructive">
          {t("loss.value.destroyed")} · {formatIsk(pm.destroyed_value)} ISK
        </span>
        <span className="text-success">
          {t("loss.value.dropped")} · {formatIsk(pm.dropped_value)} ISK ({Math.round(pm.dropped_ratio * 100)}%)
        </span>
        {pm.fitted_value > 0 && (
          <span className="text-muted-foreground">
            {t("loss.value.fitted")} · {formatIsk(pm.fitted_value)} ISK
          </span>
        )}
      </div>
    </div>
  );
}

function Breakdown({ pm }: { pm: PostMortem }) {
  const t = useT();
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("loss.comp.ships")}</div>
        <div className="flex flex-wrap gap-1.5">
          {pm.ship_breakdown.slice(0, 10).map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-1.5 py-0.5 text-xs"
              title={s.name ?? String(s.id)}
            >
              <img src={typeIconUrl(s.id, 32)} alt="" className="h-4 w-4 rounded" />
              <span className="max-w-[9rem] truncate">{s.name ?? `#${s.id}`}</span>
              <span className="font-semibold text-muted-foreground">×{s.count}</span>
            </span>
          ))}
        </div>
      </div>
      {pm.alliances.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("loss.comp.alliances")}</div>
          <div className="flex flex-wrap gap-1.5">
            {pm.alliances.slice(0, 6).map((a) => (
              <span
                key={a.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-1.5 py-0.5 text-xs",
                )}
                title={a.name ?? String(a.id)}
              >
                <img src={allianceLogoUrl(a.id, 32)} alt="" className="h-4 w-4 rounded" />
                <span className="max-w-[9rem] truncate">{a.name ?? `#${a.id}`}</span>
                <span className="font-semibold text-muted-foreground">×{a.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
