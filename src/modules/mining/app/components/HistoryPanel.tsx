import { useState } from "react";
import {
  History,
  FileText,
  Download,
  RotateCcw,
  Trash2,
  Clock,
  Users,
  Pickaxe,
  Coins,
  Crown,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import {
  isMinedSession,
  minedSummary,
  sessionDurationMs,
  sessionIskValue,
  totalBelts,
} from "@mining/lib/domain";
import { downloadReport } from "@mining/lib/report";
import { SESSION_EVENTS } from "@mining/data/events";
import {
  formatDateTime,
  formatDurationShort,
  formatIsk,
} from "@mining/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Badge } from "@mining/components/ui/badge";
import { BeltTypeBadge } from "@mining/components/BeltTypeBadge";
import { ReportDialog } from "@mining/components/ReportDialog";

export function HistoryPanel() {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const ended = sessions
    .filter((s) => s.status === "ended")
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t("mining.history.title")}
          <Badge variant="muted">{ended.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ended.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("mining.history.empty")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {ended.map((s) => (
              <HistoryRow key={s.id} session={s} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryRow({ session }: { session: Session }) {
  const t = useT();
  const reopen = useStore((s) => s.reopenSession);
  const remove = useStore((s) => s.deleteSession);
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const [confirm, setConfirm] = useState(false);

  const duration = sessionDurationMs(session, session.endedAt ?? Date.now());
  const isMined = isMinedSession(session);
  const mined = isMined ? minedSummary(session) : null;
  const belts = totalBelts(session);
  // Même valeur que le rapport : butin miné valorisé (ou override), sinon total saisi.
  const iskValue = sessionIskValue(session);
  const fc = session.members.find((m) => m.fc);

  return (
    <li className="rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{session.name}</span>
            {session.types.map((bt) => (
              <BeltTypeBadge key={bt} type={bt} />
            ))}
            {fc && (
              <Badge
                variant="outline"
                className="gap-1 text-[9px] border-fc/40 bg-fc/15 text-fc"
              >
                <Crown className="h-2.5 w-2.5" /> {t("mining.history.fc", { name: fc.name })}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatDateTime(session.startedAt)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ReportDialog
            session={session}
            trigger={
              <Button size="sm" variant="outline">
                <FileText className="h-4 w-4" /> {t("mining.history.report")}
              </Button>
            }
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={t("mining.history.downloadMd")}
            onClick={() => downloadReport(session, members, groups, t)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={t("mining.history.reopen")}
            onClick={() => reopen(session.id)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={
              confirm
                ? "h-8 w-8 text-destructive bg-destructive/10"
                : "h-8 w-8 text-muted-foreground hover:text-destructive"
            }
            title={confirm ? t("mining.history.confirmDelete") : t("mining.history.delete")}
            onClick={() => {
              if (confirm) remove(session.id);
              else {
                setConfirm(true);
                window.setTimeout(() => setConfirm(false), 2500);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground tabular-nums">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {formatDurationShort(duration)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {session.members.length}
        </span>
        <span className="flex items-center gap-1">
          <Pickaxe className="h-3.5 w-3.5" />{" "}
          {mined
            ? t("mining.history.unitsMined", { n: formatIsk(mined.totalQty) })
            : t("mining.history.belts", { n: belts })}
        </span>
        <span className="flex items-center gap-1 text-primary font-medium">
          <Coins className="h-3.5 w-3.5" /> {formatIsk(iskValue)} ISK
        </span>
      </div>
      {Object.keys(session.events ?? {}).length > 0 && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {SESSION_EVENTS.filter((e) => (session.events?.[e.key] ?? 0) > 0).map(
            (e) => (
              <span
                key={e.key}
                className="text-[11px] text-muted-foreground"
                title={t("mining.event." + e.key)}
              >
                {e.icon} {session.events[e.key]}
              </span>
            )
          )}
        </div>
      )}
    </li>
  );
}
