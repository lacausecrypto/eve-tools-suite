import { useMemo, useState } from "react";
import { Dice5 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { typeIconUrl } from "@/core/images";
import { useT } from "@/core/i18n";
import { useActivity } from "../store";
import { ACTIVITIES } from "../data/activities";
import { dropRates } from "../lib/compute";
import { fmtIsk, fmtQty } from "../lib/format";
import type { ActivityId } from "../lib/types";

export function DropRatesView() {
  const t = useT();
  const { history, basis } = useActivity();
  const [activity, setActivity] = useState<ActivityId>("abyssal");
  const [site, setSite] = useState("");

  const sessions = useMemo(
    () =>
      history.filter(
        (h) => h.activity === activity && (!site.trim() || h.siteLabel.toLowerCase().includes(site.trim().toLowerCase())),
      ),
    [history, activity, site],
  );
  const { rows, totalRuns } = useMemo(() => dropRates(sessions, basis), [sessions, basis]);
  const valuePerRun = rows.reduce((s, r) => s + r.valuePerRun, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("activity.activity")}</span>
            <Select value={activity} onValueChange={(v) => setActivity(v as ActivityId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {t("activity.act." + a.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("activity.drops.filter")}</span>
            <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder={t("activity.drops.filter.ph")} spellCheck={false} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            {sessions.length} {t("activity.drops.sessions")} · <strong className="text-foreground">{totalRuns}</strong> {t("activity.drops.runs")}
          </span>
          <span className="text-muted-foreground">
            {t("activity.drops.avgPerRun")} <strong className="text-success">{fmtIsk(valuePerRun)}</strong>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
          <Dice5 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          {t("activity.drops.empty", { activity: t("activity.act." + activity) })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("activity.drops.col.item")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("activity.drops.col.appeared")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("activity.drops.col.totalQty")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("activity.drops.col.perRun")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("activity.drops.col.valuePerRun")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.typeId} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={typeIconUrl(r.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                      <span className="truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{(r.appearedPct * 100).toFixed(0)} %</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtQty(r.totalQty)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.perRun >= 1 ? fmtQty(r.perRun) : r.perRun.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-success">{fmtIsk(r.valuePerRun)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
