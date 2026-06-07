import { useMemo, useState } from "react";
import { Trophy, Crown, Medal, Users, ChevronUp, ChevronDown } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import {
  buildLeaderboard,
  leaderboardStats,
  type LeaderboardRow,
} from "@mining/lib/domain";
import { formatDurationShort, formatIsk, formatIskFull } from "@mining/lib/format";
import { PilotDetailDialog } from "@mining/components/PilotDetailDialog";
import { LeaderboardDashboard } from "@mining/components/LeaderboardDashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Badge } from "@mining/components/ui/badge";
import { cn } from "@mining/lib/utils";

const RANK_STYLES = [
  "bg-primary/15 text-primary border-primary/30",
  "bg-fleur/15 text-fleur border-fleur/30",
  "bg-muted text-muted-foreground border-border",
];

type SortKey = "name" | "sessions" | "presence" | "units" | "isk";

const SORT_VALUE: Record<SortKey, (r: LeaderboardRow) => number | string> = {
  name: (r) => r.name.toLowerCase(),
  sessions: (r) => r.sessions,
  presence: (r) => r.totalActiveMs,
  units: (r) => r.totalUnits,
  isk: (r) => r.totalIsk,
};

export function Leaderboard() {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const rows = buildLeaderboard(sessions, members, groups);
  const stats = useMemo(
    () => leaderboardStats(sessions, members, groups),
    [sessions, members, groups]
  );
  const [selected, setSelected] = useState<{ key: string; name: string } | null>(
    null
  );
  const [sortKey, setSortKey] = useState<SortKey>("isk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const get = SORT_VALUE[sortKey];
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "string" || typeof vb === "string")
        return dir * String(va).localeCompare(String(vb));
      return dir * (va - vb);
    });
  }, [rows, sortKey, sortDir]);

  const isPodium = sortKey === "isk" && sortDir === "desc";

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
    {rows.length > 0 && <LeaderboardDashboard stats={stats} />}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          {t("mining.lb.title")}
          <Badge variant="muted">{t("mining.lb.endedSessions")}</Badge>
          {rows.length > 0 && (
            <span className="text-[11px] font-normal text-muted-foreground ml-auto">
              {t("mining.lb.clickPilot")}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("mining.lb.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <SortTh
                    label={t("mining.lb.col.pilot")}
                    col="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortTh
                    label={t("mining.lb.col.sessions")}
                    col="sessions"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortTh
                    label={t("mining.lb.col.presence")}
                    col="presence"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortTh
                    label={t("mining.lb.col.ore")}
                    col="units"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortTh
                    label={t("mining.lb.col.isk")}
                    col="isk"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={r.key}
                    onClick={() => setSelected({ key: r.key, name: r.name })}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pr-2">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold",
                          isPodium && i < 3
                            ? RANK_STYLES[i]
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {isPodium && i === 0 ? (
                          <Crown className="h-3.5 w-3.5" />
                        ) : isPodium && i < 3 ? (
                          <Medal className="h-3.5 w-3.5" />
                        ) : (
                          i + 1
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        {r.name}
                        {r.alts.length > 1 && (
                          <Badge variant="muted" className="text-[9px] gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {r.alts.length}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                      {r.sessions}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                      {formatDurationShort(r.totalActiveMs)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                      {formatIsk(r.totalUnits)}
                    </td>
                    <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-primary">
                      {formatIskFull(r.totalIsk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    <PilotDetailDialog pilot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SortTh({
  label,
  col,
  align,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  col: SortKey;
  align?: "right";
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      className={cn(
        "py-2 font-medium",
        align === "right" ? "px-2 text-right" : "pr-2"
      )}
    >
      <button
        onClick={() => onClick(col)}
        className={cn(
          "inline-flex items-center gap-1 select-none hover:text-foreground transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-20" />
        )}
      </button>
    </th>
  );
}
