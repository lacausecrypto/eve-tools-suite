import { useState } from "react";
import {
  UserPlus,
  UserMinus,
  Power,
  Clock,
  Check,
  Rocket,
  Telescope,
  Crown,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import { activeMs, isActive } from "@mining/lib/domain";
import { formatDuration } from "@mining/lib/format";
import { MINING_SHIPS } from "@mining/data/ships";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@mining/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Badge } from "@mining/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mining/components/ui/dialog";
import { cn } from "@mining/lib/utils";

export function PresencePanel({
  session,
  now,
}: {
  session: Session;
  now: number;
}) {
  const t = useT();
  const toggle = useStore((s) => s.toggleParticipantPresence);
  const remove = useStore((s) => s.removeParticipant);
  const setBarge = useStore((s) => s.setParticipantBarge);
  const setScout = useStore((s) => s.setParticipantScout);
  const setFc = useStore((s) => s.setParticipantFc);
  const readOnly = session.status === "ended";

  // Fleet Commander en tête, puis par présence.
  const sorted = [...session.members].sort(
    (a, b) =>
      (b.fc ? 1 : 0) - (a.fc ? 1 : 0) || activeMs(b, now) - activeMs(a, now)
  );
  const activeCount = session.members.filter(isActive).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {t("mining.presence.title")}
          <Badge variant="success">{t("mining.presence.activeBadge", { n: activeCount, s: activeCount > 1 ? "s" : "" })}</Badge>
          <Badge variant="muted">{t("mining.presence.totalBadge", { n: session.members.length })}</Badge>
        </CardTitle>
        {!readOnly && <AddParticipantDialog session={session} />}
      </CardHeader>
      <CardContent>
        {session.members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("mining.presence.empty")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((m) => {
              const active = isActive(m);
              return (
                <li
                  key={m.memberId}
                  className={cn(
                    "rounded-lg border px-3 py-2 transition-colors space-y-1.5",
                    active
                      ? "border-success/30 bg-success/5"
                      : "border-border/60 bg-background/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        active
                          ? "bg-success animate-pulse"
                          : "bg-muted-foreground/40"
                      )}
                    />
                    <span className="font-medium flex-1 truncate min-w-0">
                      {m.name}
                    </span>
                    {m.fc && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-[9px] shrink-0 border-fc/40 bg-fc/15 text-fc"
                      >
                        <Crown className="h-2.5 w-2.5" /> FC
                      </Badge>
                    )}
                    {m.scout && (
                      <Badge
                        variant="default"
                        className="gap-1 text-[9px] shrink-0"
                      >
                        <Telescope className="h-2.5 w-2.5" /> Scout
                      </Badge>
                    )}
                    <span className="tabular-nums text-sm text-muted-foreground shrink-0">
                      {formatDuration(activeMs(m, now))}
                    </span>
                    {!readOnly && (
                      <>
                        <Button
                          size="sm"
                          variant={active ? "outline" : "success"}
                          className="h-7 px-2"
                          onClick={() => toggle(session.id, m.memberId)}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {active ? t("mining.presence.pause") : t("mining.presence.resume")}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(session.id, m.memberId)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-5">
                    <Rocket className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {readOnly ? (
                      <span className="text-xs text-muted-foreground">
                        {m.barge ?? t("mining.presence.noBarge")}
                      </span>
                    ) : (
                      <Select
                        value={m.barge ?? ""}
                        onValueChange={(v) => setBarge(session.id, m.memberId, v)}
                      >
                        <SelectTrigger className="h-7 w-full max-w-[220px] text-xs">
                          <SelectValue placeholder={t("mining.presence.chooseBarge")} />
                        </SelectTrigger>
                        <SelectContent>
                          {MINING_SHIPS.map((g) => (
                            <SelectGroup key={g.key}>
                              <SelectLabel>{t("mining.shipGroup." + g.key)}</SelectLabel>
                              {g.ships.map((ship) => (
                                <SelectItem key={ship} value={ship}>
                                  {ship === "Autre vaisseau" ? t("mining.ship.other") : ship}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {!readOnly && (
                      <div className="ml-auto flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant={m.fc ? "default" : "outline"}
                          className={cn(
                            "h-7 px-2",
                            m.fc &&
                              "bg-fc text-white hover:bg-fc/90 border-fc"
                          )}
                          title={t("mining.presence.designateFc")}
                          onClick={() => setFc(session.id, m.memberId, !m.fc)}
                        >
                          <Crown className="h-3.5 w-3.5" /> FC
                        </Button>
                        <Button
                          size="sm"
                          variant={m.scout ? "default" : "outline"}
                          className="h-7 px-2"
                          title={t("mining.presence.markScout")}
                          onClick={() =>
                            setScout(session.id, m.memberId, !m.scout)
                          }
                        >
                          <Telescope className="h-3.5 w-3.5" /> Scout
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddParticipantDialog({ session }: { session: Session }) {
  const t = useT();
  const members = useStore((s) => s.members);
  const addParticipant = useStore((s) => s.addParticipant);
  const [open, setOpen] = useState(false);

  const available = members.filter(
    (m) => !session.members.some((sm) => sm.memberId === m.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4" /> {t("mining.presence.addPilot")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("mining.presence.addTitle")}</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("mining.presence.allInSession")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-auto scrollbar-thin">
            {available.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  addParticipant(session.id, m.id);
                  if (available.length === 1) setOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm hover:border-primary/60 hover:bg-accent/40 transition-colors"
              >
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            <Check className="h-4 w-4" /> {t("mining.presence.done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
