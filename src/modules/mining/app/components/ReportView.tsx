import {
  Clock,
  Users,
  Pickaxe,
  Coins,
  Crown,
  Telescope,
  Boxes,
  Gauge,
  ListChecks,
  Gem,
  Package,
  Recycle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/core/i18n";
import type { Member, PlayerGroup, Session } from "@mining/types";
import {
  consumablesSummary,
  iskShares,
  isMinedSession,
  minedSummary,
  refineSummary,
  sessionDurationMs,
  sessionIskValue,
  sessionPayout,
  stockLedger,
  totalBelts,
} from "@mining/lib/domain";
import { BELT_TYPE_LABEL } from "@mining/data/ores";
import { consumableShortLabel } from "@mining/data/consumables";
import { SESSION_EVENTS } from "@mining/data/events";
import {
  formatDate,
  formatDuration,
  formatDurationShort,
  formatIsk,
  formatIskFull,
} from "@mining/lib/format";
import {
  DonutChart,
  DonutLegend,
  type DonutDatum,
} from "@mining/components/DonutChart";
import { Badge } from "@mining/components/ui/badge";
import { BeltTypeBadge } from "@mining/components/BeltTypeBadge";

const fmtQty = (n: number) => Math.round(n).toLocaleString("fr-FR");

function topN(items: DonutDatum[], n: number, othersLabel: string): DonutDatum[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const head = sorted.slice(0, n);
  const rest = sorted.slice(n).reduce((a, x) => a + x.value, 0);
  if (rest > 0) head.push({ label: othersLabel, value: rest });
  return head;
}

export function ReportView({
  session,
  members = [],
  groups = [],
}: {
  session: Session;
  members?: Member[];
  groups?: PlayerGroup[];
}) {
  const t = useT();
  const end = session.endedAt ?? Date.now();
  const duration = sessionDurationMs(session, end);
  const hasLoot = isMinedSession(session);
  const mined = minedSummary(session);
  const payout = sessionPayout(session, members, groups);
  const payTotal = payout.reduce((a, r) => a + r.isk, 0);
  const shares = iskShares(session, end).sort((a, b) => b.activeMs - a.activeMs);
  const belts = totalBelts(session);
  const iskValue = sessionIskValue(session);
  const consumables = consumablesSummary(session);
  const stock = stockLedger(session);
  const refine = refineSummary(session);
  const fc = session.members.find((m) => m.fc);
  const scouts = session.members.filter((m) => m.scout);
  const events = SESSION_EVENTS.filter(
    (e) => (session.events?.[e.key] ?? 0) > 0
  );
  const bargeOf = new Map(session.members.map((m) => [m.memberId, m.barge]));
  const fcOf = new Map(session.members.map((m) => [m.memberId, m.fc]));
  const scoutOf = new Map(session.members.map((m) => [m.memberId, m.scout]));

  const presenceHours = shares.reduce((a, r) => a + r.activeMs, 0) / 3_600_000;
  const iskPerHour = presenceHours > 0 ? iskValue / presenceHours : 0;

  const iskByPlayer = topN(
    payout.map((r) => ({ label: r.name, value: r.isk })),
    6,
    t("mining.report.others")
  );
  const oreData = topN(
    mined.oreGroups.map((g) => ({
      label: t("mining.cat." + g.category),
      value: g.value > 0 ? g.value : g.qty,
    })),
    6,
    t("mining.report.others")
  );
  const oreTotalChart = oreData.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-5 text-sm">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold leading-tight">
            {session.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("mining.report.closedAt", { date: formatDate(session.startedAt) })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {session.types.map((bt) => (
            <BeltTypeBadge key={bt} type={bt} />
          ))}
          {fc && (
            <Badge
              variant="outline"
              className="gap-1 border-fc/40 bg-fc/15 text-fc"
            >
              <Crown className="h-3 w-3" /> {t("mining.report.fc", { name: fc.name })}
            </Badge>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <Kpi icon={Clock} label={t("mining.report.kpi.duration")} value={formatDuration(duration)} />
        <Kpi
          icon={Users}
          label={t("mining.report.kpi.participants")}
          value={String(session.members.length)}
        />
        <Kpi
          icon={Pickaxe}
          label={hasLoot ? t("mining.report.kpi.oreMined") : t("mining.report.kpi.belts")}
          value={hasLoot ? `${formatIsk(mined.totalQty)} u` : String(belts)}
        />
        <Kpi
          icon={Coins}
          label={t("mining.report.kpi.iskValue")}
          value={formatIsk(iskValue)}
          accent
        />
        <Kpi
          icon={Gauge}
          label={t("mining.report.kpi.iskPerHour")}
          value={formatIsk(iskPerHour)}
        />
        <Kpi
          icon={Pickaxe}
          label={t("mining.report.kpi.base")}
          value={hasLoot ? t("mining.report.base.mined") : t("mining.report.base.presence")}
        />
      </div>

      {/* Graphiques */}
      {hasLoot && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            icon={Crown}
            title={t("mining.report.chart.iskByPilot")}
            data={iskByPlayer}
            centerValue={formatIsk(payTotal)}
            centerLabel="ISK"
            format={(v) => formatIsk(v)}
          />
          <ChartCard
            icon={Boxes}
            title={
              mined.oreGroups.some((g) => g.value > 0)
                ? t("mining.report.chart.oreByValue")
                : t("mining.report.chart.oreByUnits")
            }
            data={oreData}
            centerValue={formatIsk(oreTotalChart)}
            centerLabel={mined.oreGroups.some((g) => g.value > 0) ? "ISK" : "u"}
            format={(v) => formatIsk(v)}
          />
        </div>
      )}

      {/* Paiements */}
      {payout.length > 0 && (
        <Section icon={Coins} title={t("mining.report.payments")}>
          {(fc || scouts.length > 0) && (
            <p className="text-[11px] text-muted-foreground mb-2">
              {fc && (
                <span className="text-fc">
                  {t("mining.report.fcAt", { name: fc.name, pct: session.fcPct })}
                </span>
              )}
              {fc && scouts.length > 0 && " · "}
              {scouts.length > 0 && (
                <span>
                  {t("mining.report.scoutsAt", { n: scouts.length, pct: session.scoutPct })}
                </span>
              )}
            </p>
          )}
          <Table
            head={[
              t("mining.report.col.rank"),
              t("mining.report.col.pilot"),
              t("mining.report.col.share"),
              t("mining.report.col.toPay"),
            ]}
            align={["", "", "right", "right"]}
          >
            {payout.map((r, i) => (
              <tr
                key={r.key}
                className="border-b border-border/40 last:border-0"
              >
                <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                <td className="py-1.5 pr-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    {r.name}
                    {r.fc && (
                      <Badge
                        variant="outline"
                        className="gap-0.5 text-[9px] border-fc/40 bg-fc/15 text-fc"
                      >
                        <Crown className="h-2.5 w-2.5" /> FC
                      </Badge>
                    )}
                    {r.scout && (
                      <Badge variant="secondary" className="gap-0.5 text-[9px]">
                        <Telescope className="h-2.5 w-2.5" /> scout
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                  {payTotal > 0 ? ((r.isk / payTotal) * 100).toFixed(1) : "0"}%
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums font-semibold text-primary">
                  {formatIskFull(r.isk)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td />
              <td className="py-1.5 pr-2">{t("mining.report.total")}</td>
              <td />
              <td className="py-1.5 pl-2 text-right tabular-nums text-primary">
                {formatIskFull(payTotal)}
              </td>
            </tr>
          </Table>
        </Section>
      )}

      {/* Minerai par catégorie & grade */}
      {hasLoot && mined.oreGroups.length > 0 && (
        <Section icon={Boxes} title={t("mining.report.oreByCatGrade")}>
          <Table
            head={[
              t("mining.report.col.category"),
              t("mining.report.col.ore"),
              t("mining.report.col.qty"),
              t("mining.report.col.unitPrice"),
              t("mining.report.col.value"),
            ]}
            align={["", "", "right", "right", "right"]}
          >
            {mined.oreGroups.flatMap((g) =>
              g.ores.map((o, i) => (
                <tr
                  key={o.ore}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {i === 0 ? t("mining.cat." + g.category) : ""}
                  </td>
                  <td className="py-1.5 pr-2">{o.ore}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {fmtQty(o.qty)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                    {o.price ? `${formatIsk(o.price)}` : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">
                    {formatIsk(o.value)}
                  </td>
                </tr>
              ))
            )}
            <tr className="font-semibold">
              <td />
              <td className="py-1.5 pr-2">{t("mining.report.total")}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">
                {fmtQty(mined.totalQty)}
              </td>
              <td />
              <td className="py-1.5 pl-2 text-right tabular-nums text-primary">
                {formatIsk(mined.totalValue)}
              </td>
            </tr>
          </Table>
        </Section>
      )}

      {/* Consommables (cristaux de minage) */}
      {consumables.hasAny && (
        <Section icon={Gem} title={t("mining.report.consTitle")}>
          <p className="text-[11px] text-muted-foreground mb-2">
            {t("mining.report.consNote")}
          </p>
          <Table
            head={[
              t("mining.report.col.crystal"),
              t("mining.report.col.qty"),
              t("mining.report.col.unitPrice"),
              t("mining.report.col.cost"),
              t("mining.report.col.byPilot"),
            ]}
            align={["", "right", "right", "right", ""]}
          >
            {consumables.items.map((it) => (
              <tr
                key={it.name}
                className="border-b border-border/40 last:border-0 align-top"
              >
                <td className="py-1.5 pr-2 font-medium">
                  {consumableShortLabel(it.name)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {fmtQty(it.totalQty)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                  {it.price ? formatIsk(it.price) : "—"}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {formatIsk(it.value)}
                </td>
                <td className="py-1.5 pl-2">
                  <span className="flex flex-wrap gap-1">
                    {it.byMiner.map((b) => (
                      <Badge
                        key={b.miner}
                        variant="muted"
                        className="text-[9px] px-1.5 py-0 gap-1 tabular-nums"
                      >
                        {b.miner}
                        <span className="text-fleur">{b.pct.toFixed(0)}%</span>
                      </Badge>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1.5 pr-2">{t("mining.report.total")}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">
                {fmtQty(consumables.totalQty)}
              </td>
              <td />
              <td className="py-1.5 px-2 text-right tabular-nums text-fleur">
                {formatIsk(consumables.totalValue)}
              </td>
              <td />
            </tr>
          </Table>
        </Section>
      )}

      {/* Retraitement : minéraux produits */}
      {refine.hasAny && (
        <Section icon={Recycle} title={t("mining.report.refineTitle")}>
          <p className="text-[11px] text-muted-foreground mb-2">
            {t("mining.report.refineFromOre", {
              yield:
                refine.efficiency >= 1
                  ? t("mining.report.refinePerfect")
                  : `${(refine.efficiency * 100).toFixed(1)} %`,
            })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {refine.minerals.map((m) => (
              <span
                key={m.name}
                className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs tabular-nums"
              >
                <span className="text-muted-foreground">{m.name}</span>{" "}
                <span className="font-semibold">{fmtQty(m.qty)}</span>
              </span>
            ))}
          </div>
          {refine.miners.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {refine.miners.map((m) => (
                <Badge
                  key={m.miner}
                  variant="muted"
                  className="text-[9px] px-1.5 py-0 gap-1 tabular-nums"
                >
                  {m.miner}
                  <span className="text-primary">{m.pct.toFixed(0)}%</span>
                </Badge>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Stock de consommables (avec mouvements +/-) */}
      {stock.hasAny && (
        <Section icon={Package} title={t("mining.report.stockTitle")}>
          {stock.hasMoves ? (
            <Table
              head={[
                t("mining.report.col.consumable"),
                t("mining.report.col.added"),
                t("mining.report.col.removed"),
                t("mining.report.col.stock"),
                t("mining.report.col.unitPrice"),
                t("mining.report.col.value"),
              ]}
              align={["", "right", "right", "right", "right", "right"]}
            >
              {stock.items.map((it) => (
                <tr
                  key={it.name}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-1.5 pr-2 font-medium">{it.name}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-success">
                    {it.added ? `+${fmtQty(it.added)}` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-primary">
                    {it.removed ? `−${fmtQty(it.removed)}` : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-medium">
                    {fmtQty(it.qty)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                    {it.price ? formatIsk(it.price) : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">
                    {formatIsk(it.value)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5 pr-2">{t("mining.report.total")}</td>
                <td className="py-1.5 px-2 text-right tabular-nums text-success">
                  +{fmtQty(stock.totalAdded)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-primary">
                  −{fmtQty(stock.totalRemoved)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {fmtQty(stock.totalQty)}
                </td>
                <td />
                <td className="py-1.5 pl-2 text-right tabular-nums text-fleur">
                  {formatIsk(stock.totalValue)}
                </td>
              </tr>
            </Table>
          ) : (
            <Table
              head={[
                t("mining.report.col.consumable"),
                t("mining.report.col.qty"),
                t("mining.report.col.unitPrice"),
                t("mining.report.col.value"),
              ]}
              align={["", "right", "right", "right"]}
            >
              {stock.items.map((it) => (
                <tr
                  key={it.name}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-1.5 pr-2 font-medium">{it.name}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    {fmtQty(it.qty)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                    {it.price ? formatIsk(it.price) : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">
                    {formatIsk(it.value)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5 pr-2">{t("mining.report.total")}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">
                  {fmtQty(stock.totalQty)}
                </td>
                <td />
                <td className="py-1.5 pl-2 text-right tabular-nums text-fleur">
                  {formatIsk(stock.totalValue)}
                </td>
              </tr>
            </Table>
          )}
        </Section>
      )}

      {/* Présence & barges */}
      {shares.length > 0 && (
        <Section icon={Clock} title={t("mining.report.presenceTitle")}>
          <Table
            head={[
              t("mining.report.col.member"),
              t("mining.report.col.barge"),
              t("mining.report.col.presence"),
            ]}
            align={["", "", "right"]}
          >
            {shares.map((row) => (
              <tr
                key={row.memberId}
                className="border-b border-border/40 last:border-0"
              >
                <td className="py-1.5 pr-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    {row.name}
                    {row.active && (
                      <span className="h-2 w-2 rounded-full bg-success" />
                    )}
                    {fcOf.get(row.memberId) && (
                      <Crown className="h-3 w-3 text-fc" />
                    )}
                    {scoutOf.get(row.memberId) && (
                      <Telescope className="h-3 w-3 text-fleur" />
                    )}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {bargeOf.get(row.memberId) ?? "—"}
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground">
                  {formatDurationShort(row.activeMs)}
                </td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {/* Belts par type */}
      {Object.keys(session.beltCounts ?? {}).length > 0 && (
        <Section icon={Pickaxe} title={t("mining.report.beltsByType")}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(session.beltCounts).map(([bt, n]) => (
              <Badge key={bt} variant="secondary" className="gap-1">
                {BELT_TYPE_LABEL[bt as keyof typeof BELT_TYPE_LABEL]
                  ? t("mining.beltType." + bt)
                  : bt}{" "}
                · {n}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Événements */}
      {events.length > 0 && (
        <Section icon={ListChecks} title={t("mining.report.events")}>
          <div className="flex flex-wrap gap-2">
            {events.map((e) => (
              <Badge key={e.key} variant="muted" className="gap-1">
                {e.icon} {t("mining.event." + e.key)} · {session.events[e.key]}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {session.notes.trim() && (
        <Section icon={ListChecks} title={t("mining.report.notes")}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {session.notes.trim()}
          </p>
        </Section>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={`text-base font-semibold tabular-nums leading-tight mt-0.5 truncate ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

function Table({
  head,
  align,
  children,
}: {
  head: string[];
  align: ("" | "right")[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
            {head.map((h, i) => (
              <th
                key={h + i}
                className={`py-1.5 font-medium ${
                  align[i] === "right" ? "text-right px-2" : "pr-2"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  title,
  data,
  centerValue,
  centerLabel,
  format,
}: {
  icon: LucideIcon;
  title: string;
  data: DonutDatum[];
  centerValue: string;
  centerLabel: string;
  format: (v: number) => string;
}) {
  const t = useT();
  const empty = data.every((d) => d.value <= 0);
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          {t("mining.report.chart.empty")}
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <DonutChart
            data={data}
            centerValue={centerValue}
            centerLabel={centerLabel}
          />
          <DonutLegend data={data} format={format} />
        </div>
      )}
    </div>
  );
}
