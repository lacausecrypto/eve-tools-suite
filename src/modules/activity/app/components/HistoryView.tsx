import { Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { Badge } from "@/components/ui/badge";
import { useActivity } from "../store";
import { ACTIVITIES, activityDef } from "../data/activities";
import { computeTotals } from "../lib/compute";
import { fmtDuration, fmtIsk } from "../lib/format";

export function HistoryView() {
  const t = useT();
  const { history, basis, removeSession } = useActivity();

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
        <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
        {t("activity.history.empty")}
      </div>
    );
  }

  // Agrégat par activité (ISK/h moyen pondéré par le temps).
  const byActivity = ACTIVITIES.map((a) => {
    const sessions = history.filter((h) => h.activity === a.id);
    if (!sessions.length) return null;
    let net = 0;
    let sec = 0;
    for (const s of sessions) {
      const tot = computeTotals(s.loot, s.income, s.costs, s.durationSec, s.runs, basis);
      net += tot.net;
      sec += s.durationSec;
    }
    const hours = sec / 3600;
    return { id: a.id, count: sessions.length, net, iskPerHour: hours > 0 ? net / hours : 0, hours };
  }).filter(Boolean) as { id: string; count: number; net: number; iskPerHour: number; hours: number }[];

  return (
    <div className="space-y-4">
      {/* Synthèse par activité */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {byActivity.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card/40 p-3">
            <div className="text-sm font-semibold">{t("activity.act." + a.id)}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-semibold tabular-nums text-success">{fmtIsk(a.iskPerHour)}/h</span>
              <span className="text-xs text-muted-foreground">{a.count} {t("activity.history.sess")} · {fmtDuration(a.hours * 3600)}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t("activity.history.netCumulative")} {fmtIsk(a.net)}</div>
          </div>
        ))}
      </div>

      {/* Liste détaillée */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="mb-2 text-sm font-semibold">{t("activity.history.sessions")}</div>
        <div className="space-y-1.5">
          {history.map((s) => {
            const tot = computeTotals(s.loot, s.income, s.costs, s.durationSec, s.runs, basis);
            const def = activityDef(s.activity);
            const date = new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm">
                <Badge variant="muted">{t("activity.act." + def.id)}</Badge>
                {s.siteLabel && <span className="text-xs text-muted-foreground">{s.siteLabel}</span>}
                <span className="text-xs text-muted-foreground">{date}</span>
                <div className="ml-auto flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="text-muted-foreground">{fmtDuration(s.durationSec)}</span>
                  {def.hasRuns && <span className="text-muted-foreground">{s.runs} {t("activity.history.runs")}</span>}
                  <span className={cn("font-medium tabular-nums", tot.net >= 0 ? "text-success" : "text-destructive")}>{fmtIsk(tot.net)}</span>
                  <span className="font-semibold tabular-nums text-success">{fmtIsk(tot.iskPerHour)}/h</span>
                  <button onClick={() => removeSession(s.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
