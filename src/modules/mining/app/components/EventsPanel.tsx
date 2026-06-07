import { Minus, ListChecks, StickyNote } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import { SESSION_EVENTS } from "@mining/data/events";
import { Card, CardContent, CardHeader, CardTitle } from "@mining/components/ui/card";
import { Badge } from "@mining/components/ui/badge";
import { cn } from "@mining/lib/utils";

export function EventsPanel({ session }: { session: Session }) {
  const t = useT();
  const incrementEvent = useStore((s) => s.incrementEvent);
  const setNotes = useStore((s) => s.setSessionNotes);
  const readOnly = session.status === "ended";
  const events = session.events ?? {};
  const total = Object.values(events).reduce((a, n) => a + n, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          {t("mining.events.title")}
          {total > 0 && (
            <Badge variant="muted" className="tabular-nums">
              {total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SESSION_EVENTS.map((ev) => {
            const count = events[ev.key] ?? 0;
            const label = t("mining.event." + ev.key);
            return (
              <div
                key={ev.key}
                className={cn(
                  "flex items-stretch rounded-lg border overflow-hidden transition-colors",
                  count > 0
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-background/40"
                )}
              >
                <button
                  disabled={readOnly}
                  onClick={() => incrementEvent(session.id, ev.key, 1)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 hover:bg-accent/40 transition-colors disabled:opacity-60"
                  title={t("mining.events.plusOne", { label })}
                >
                  <span className="text-lg leading-none">{ev.icon}</span>
                  <span className="text-[11px] leading-tight text-center">
                    {label}
                  </span>
                  {count > 0 && (
                    <span className="text-base font-bold tabular-nums text-primary leading-none mt-0.5">
                      {count}
                    </span>
                  )}
                </button>
                {count > 0 && !readOnly && (
                  <button
                    onClick={() => incrementEvent(session.id, ev.key, -1)}
                    title={t("mining.events.minusOne")}
                    className="px-1.5 flex items-center justify-center border-l border-border/60 text-muted-foreground hover:text-destructive hover:bg-accent/40 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <StickyNote className="h-3 w-3" /> {t("mining.events.note")}
          </label>
          <textarea
            value={session.notes}
            disabled={readOnly}
            onChange={(e) => setNotes(session.id, e.target.value)}
            placeholder={t("mining.events.notePlaceholder")}
            className="min-h-[44px] w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring scrollbar-thin disabled:opacity-70"
          />
        </div>
      </CardContent>
    </Card>
  );
}
