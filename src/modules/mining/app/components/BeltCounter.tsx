import { useRef } from "react";
import { Plus, Minus, Pickaxe } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import { BELT_TYPES } from "@mining/data/ores";
import type { Session } from "@mining/types";
import { totalBelts } from "@mining/lib/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Badge } from "@mining/components/ui/badge";

export function BeltCounter({ session }: { session: Session }) {
  const t = useT();
  const incrementBeltType = useStore((s) => s.incrementBeltType);
  const readOnly = session.status === "ended";
  const total = totalBelts(session);

  // On compte les belts pour les types de gisement de la session.
  const types = BELT_TYPES.filter((bt) => session.types.includes(bt.value));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Pickaxe className="h-4 w-4 text-primary" />
          {t("mining.belt.title")}
          <Badge variant="default" className="tabular-nums">
            {t("mining.belt.count", { n: total, s: total > 1 ? "s" : "" })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {types.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pickaxe className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("mining.belt.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {types.map((bt) => (
              <BeltTypeStepper
                key={bt.value}
                icon={bt.icon}
                label={t("mining.beltType." + bt.value)}
                count={session.beltCounts?.[bt.value] ?? 0}
                readOnly={readOnly}
                onInc={(d) => incrementBeltType(session.id, bt.value, d)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BeltTypeStepper({
  icon,
  label,
  count,
  readOnly,
  onInc,
}: {
  icon: string;
  label: string;
  count: number;
  readOnly: boolean;
  onInc: (delta: number) => void;
}) {
  const countRef = useRef<HTMLSpanElement>(null);

  function bump(delta: number) {
    onInc(delta);
    const el = countRef.current;
    if (el) {
      el.classList.remove("animate-pop");
      void el.offsetWidth;
      el.classList.add("animate-pop");
    }
  }

  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-2.5">
      <div className="text-sm font-medium text-center mb-1.5 flex items-center justify-center gap-1.5">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0"
          disabled={readOnly || count === 0}
          onClick={() => bump(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          ref={countRef}
          className="flex-1 text-center text-2xl font-bold tabular-nums tracking-tight"
        >
          {count}
        </span>
        <Button
          variant="default"
          className="h-9 w-9 shrink-0 p-0"
          disabled={readOnly}
          onClick={() => bump(1)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
