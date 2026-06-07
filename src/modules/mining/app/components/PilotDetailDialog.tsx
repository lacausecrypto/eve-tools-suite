import { useMemo, useState } from "react";
import { Coins, Clock, Pickaxe, Rocket, Boxes } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import {
  characterHistory,
  pilotHistory,
  type PilotHistory,
} from "@mining/lib/domain";
import {
  formatDate,
  formatDurationShort,
  formatIsk,
  formatIskFull,
} from "@mining/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@mining/components/ui/dialog";
import { Badge } from "@mining/components/ui/badge";
import { Separator } from "@mining/components/ui/separator";
import { BeltTypeBadge } from "@mining/components/BeltTypeBadge";
import { cn } from "@mining/lib/utils";

const fmtQty = (n: number) => Math.round(n).toLocaleString("fr-FR");

export function PilotDetailDialog({
  pilot,
  onClose,
}: {
  pilot: { key: string; name: string } | null;
  onClose: () => void;
}) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const [view, setView] = useState<"grouped" | "chars">("grouped");

  const history = useMemo(
    () => (pilot ? pilotHistory(sessions, members, groups, pilot.key) : null),
    [sessions, members, groups, pilot]
  );
  const charHistories = useMemo(
    () =>
      history && history.alts.length > 1
        ? history.alts.map((a) => characterHistory(sessions, a))
        : [],
    [history, sessions]
  );

  const multi = (history?.alts.length ?? 0) > 1;

  return (
    <Dialog open={!!pilot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {history && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
                  {history.name.charAt(0).toUpperCase()}
                </div>
                {history.name}
              </DialogTitle>
            </DialogHeader>

            {multi && (
              <div className="flex flex-wrap items-center justify-between gap-2 -mt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("mining.pilot.characters")}
                  </span>
                  {history.alts.map((a) => (
                    <Badge key={a} variant="secondary" className="text-[10px]">
                      {a}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
                  {[
                    { v: "grouped" as const, label: t("mining.pilot.grouped") },
                    { v: "chars" as const, label: t("mining.pilot.byCharacter") },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setView(opt.v)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        view === opt.v
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!multi || view === "grouped" ? (
              <HistoryBody history={history} />
            ) : (
              <div className="max-h-[60vh] overflow-auto scrollbar-thin pr-1 space-y-2">
                {charHistories.map((ch) => (
                  <CharacterCard key={ch.name} history={ch} />
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Corps détaillé (vue groupée) : totaux + barges + minerais + sessions. */
function HistoryBody({ history }: { history: PilotHistory }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat icon={Rocket} label={t("mining.pilot.stat.sessions")} value={String(history.sessions.length)} />
        <Stat icon={Clock} label={t("mining.pilot.stat.presence")} value={formatDurationShort(history.totalActiveMs)} />
        <Stat icon={Pickaxe} label={t("mining.pilot.stat.ore")} value={`${formatIsk(history.totalUnits)} u`} />
        <Stat icon={Coins} label={t("mining.pilot.stat.isk")} value={formatIsk(history.totalIsk)} accent />
      </div>

      <div className="space-y-4 mt-3 max-h-[55vh] overflow-auto scrollbar-thin pr-1">
        {history.barges.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5" /> {t("mining.pilot.bargesUsed")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.barges.map((b) => (
                <Badge key={b.ship} variant="secondary">
                  {b.ship} ×{b.count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {history.ores.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" /> {t("mining.pilot.oresMined")}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {history.ores.map((o) => (
                <div
                  key={o.ore}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-sm"
                >
                  <span className="truncate">{o.ore}</span>
                  <span className="tabular-nums text-muted-foreground text-xs shrink-0">
                    {fmtQty(o.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            {t("mining.pilot.sessionsCount", { n: history.sessions.length })}
          </div>
          <ul className="space-y-2">
            {history.sessions.map((s) => (
              <li
                key={s.sessionId}
                className="rounded-lg border border-border/70 bg-background/40 p-2.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium truncate">{s.name}</span>
                  <span className="tabular-nums font-semibold text-primary text-sm">
                    {formatIskFull(s.isk)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {s.types.map((bt) => (
                    <BeltTypeBadge key={bt} type={bt} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                  <span>{formatDate(s.startedAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDurationShort(s.activeMs)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Pickaxe className="h-3 w-3" /> {fmtQty(s.units)} u
                  </span>
                  {s.barge && (
                    <span className="flex items-center gap-1">
                      <Rocket className="h-3 w-3" /> {s.barge}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/** Carte compacte d'un personnage (vue « par personnage »). */
function CharacterCard({ history }: { history: PilotHistory }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold shrink-0">
          {history.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold truncate">{history.name}</span>
        <span className="ml-auto tabular-nums font-semibold text-primary shrink-0">
          {formatIskFull(history.totalIsk)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground tabular-nums">
        <span>
          {history.sessions.length}{" "}
          {t("mining.pilot.sessionWord", {
            s: history.sessions.length > 1 ? "s" : "",
          })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formatDurationShort(history.totalActiveMs)}
        </span>
        <span className="flex items-center gap-1">
          <Pickaxe className="h-3 w-3" /> {formatIsk(history.totalUnits)} u
        </span>
        {history.barges.length > 0 && (
          <span className="flex items-center gap-1">
            <Rocket className="h-3 w-3" />{" "}
            {history.barges.map((b) => `${b.ship}×${b.count}`).join(", ")}
          </span>
        )}
      </div>

      {history.ores.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {history.ores.map((o) => (
            <span
              key={o.ore}
              className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
            >
              {o.ore}{" "}
              <span className="text-foreground/80">{fmtQty(o.qty)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Coins;
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
        className={`text-base font-semibold tabular-nums ${accent ? "text-primary" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
