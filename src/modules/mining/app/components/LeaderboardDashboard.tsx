import type { LucideIcon } from "lucide-react";
import {
  Coins,
  Pickaxe,
  Users,
  Rocket,
  Clock,
  Gauge,
  Crown,
  PieChart,
} from "lucide-react";
import { useT } from "@/core/i18n";
import type { LeaderboardStats } from "@mining/lib/domain";
import { formatDurationShort, formatIsk } from "@mining/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@mining/components/ui/card";
import { DonutChart, DonutLegend, type DonutDatum } from "@mining/components/DonutChart";

const fmtIsk = (v: number) => `${formatIsk(v)}`;

export function LeaderboardDashboard({ stats }: { stats: LeaderboardStats }) {
  const t = useT();
  const iskTotal = stats.iskByPlayer.reduce((a, d) => a + d.value, 0);
  const oreTotal = stats.oreByCategory.reduce((a, d) => a + d.value, 0);
  const presenceTotal = stats.presenceByPlayer.reduce((a, d) => a + d.value, 0);
  const iskData: DonutDatum[] = stats.iskByPlayer;
  const oreData: DonutDatum[] = stats.oreByCategory;
  const presenceData: DonutDatum[] = stats.presenceByPlayer;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          {t("mining.dash.title")}
          <span className="text-[11px] font-normal text-muted-foreground">
            {t("mining.dash.endedSessions")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <Kpi
            icon={Coins}
            label={t("mining.dash.kpi.iskDistributed")}
            value={`${formatIsk(stats.totalIsk)}`}
            accent
          />
          <Kpi
            icon={Pickaxe}
            label={t("mining.dash.kpi.oreMined")}
            value={`${formatIsk(stats.totalUnits)} u`}
          />
          <Kpi icon={Users} label={t("mining.dash.kpi.pilots")} value={String(stats.playerCount)} />
          <Kpi
            icon={Rocket}
            label={t("mining.dash.kpi.sessions")}
            value={String(stats.sessionCount)}
          />
          <Kpi
            icon={Clock}
            label={t("mining.dash.kpi.presence")}
            value={formatDurationShort(stats.totalActiveMs)}
          />
          <Kpi
            icon={Gauge}
            label={t("mining.dash.kpi.iskPerHour")}
            value={`${formatIsk(stats.iskPerHour)}`}
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            icon={Crown}
            title={t("mining.dash.chart.iskByPilot")}
            data={iskData}
            centerValue={formatIsk(iskTotal)}
            centerLabel="ISK"
            format={fmtIsk}
          />
          <ChartCard
            icon={Clock}
            title={t("mining.dash.chart.presenceByPilot")}
            data={presenceData}
            centerValue={formatDurationShort(presenceTotal)}
            centerLabel={t("mining.dash.chart.presence")}
            format={formatDurationShort}
          />
          <ChartCard
            icon={PieChart}
            title={
              stats.oreCompositionByValue
                ? t("mining.dash.chart.oreByValue")
                : t("mining.dash.chart.oreByUnits")
            }
            data={oreData}
            centerValue={formatIsk(oreTotal)}
            centerLabel={stats.oreCompositionByValue ? "ISK" : "u"}
            format={fmtIsk}
          />
        </div>
      </CardContent>
    </Card>
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
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={`text-lg font-semibold tabular-nums leading-tight mt-0.5 ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
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
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {empty ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          {t("mining.dash.chart.empty")}
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
