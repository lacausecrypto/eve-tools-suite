import { Clock, Users, Pickaxe, Coins, Rocket } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import { useNow } from "@mining/hooks/useNow";
import type { Session } from "@mining/types";
import {
  isActive,
  isMinedSession,
  sessionDurationMs,
  sessionIskValue,
  totalBelts,
} from "@mining/lib/domain";
import { formatDuration, formatIsk } from "@mining/lib/format";
import { StatCard } from "@mining/components/StatCard";
import { PresencePanel } from "@mining/components/PresencePanel";
import { BeltCounter } from "@mining/components/BeltCounter";
import { LootImportPanel } from "@mining/components/LootImportPanel";
import { StockPanel } from "@mining/components/StockPanel";
import { EventsPanel } from "@mining/components/EventsPanel";
import { PayoutPanel } from "@mining/components/PayoutPanel";
import { NewSessionDialog } from "@mining/components/NewSessionDialog";
import { cn } from "@mining/lib/utils";
import { EndSessionDialog } from "@mining/components/EndSessionDialog";
import { Button } from "@mining/components/ui/button";
import { Card, CardContent } from "@mining/components/ui/card";
import { BELT_TYPES } from "@mining/data/ores";

export function ActiveSession() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const session =
    sessions.find((s) => s.id === activeSessionId && s.status === "active") ??
    sessions.find((s) => s.status === "active") ??
    null;

  if (!session) return <NoActiveSession />;
  return <ActiveSessionView session={session} />;
}

function NoActiveSession() {
  const t = useT();
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Rocket className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t("mining.active.none.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("mining.active.none.desc")}
          </p>
        </div>
        <NewSessionDialog
          trigger={
            <Button size="lg">
              <Rocket className="h-4 w-4" /> {t("mining.session.new")}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

function ActiveSessionView({ session }: { session: Session }) {
  const t = useT();
  const now = useNow(1000);
  const toggleSessionType = useStore((s) => s.toggleSessionType);
  const duration = sessionDurationMs(session, now);
  const activeCount = session.members.filter(isActive).length;
  const belts = totalBelts(session);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* En-tête session */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
          </span>
          <div>
            <h2 className="text-xl font-semibold leading-tight">
              {session.name}
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {BELT_TYPES.map((bt) => {
                const on = session.types.includes(bt.value);
                return (
                  <button
                    key={bt.value}
                    onClick={() => toggleSessionType(session.id, bt.value)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                      on
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {bt.icon} {t("mining.beltType." + bt.value)}
                  </button>
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-1">
                {t("mining.active.depositHint")}
              </span>
            </div>
          </div>
        </div>
        <EndSessionDialog session={session} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label={t("mining.active.stat.duration")}
          value={formatDuration(duration)}
          accent="primary"
        />
        <StatCard
          icon={Users}
          label={t("mining.active.stat.activePilots")}
          value={`${activeCount}/${session.members.length}`}
          accent="success"
        />
        <StatCard
          icon={Pickaxe}
          label={t("mining.active.stat.belts")}
          value={String(belts)}
          sub={t("mining.active.stat.beltTypes", { n: session.types.length })}
          accent="primary"
        />
        <StatCard
          icon={Coins}
          label={t("mining.active.stat.totalIsk")}
          value={`${formatIsk(sessionIskValue(session))}`}
          sub={isMinedSession(session) ? t("mining.active.stat.valuedJita") : undefined}
          accent="muted"
        />
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <LootImportPanel session={session} />
          <StockPanel session={session} />
          <BeltCounter session={session} />
          <EventsPanel session={session} />
        </div>
        <div className="space-y-4">
          <PresencePanel session={session} now={now} />
          <PayoutPanel session={session} />
        </div>
      </div>
    </div>
  );
}
