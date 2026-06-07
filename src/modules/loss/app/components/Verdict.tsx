import { AlertTriangle, Info, Lightbulb, ShieldAlert } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PostMortem } from "../api";
import { buildVerdict, victimResistHole, type VerdictSeverity } from "../lib/digest";

const DMG_KEY: Record<string, string> = {
  EM: "ship.dmg.EM",
  Thermal: "ship.dmg.Thermal",
  Kinetic: "ship.dmg.Kinetic",
  Explosive: "ship.dmg.Explosive",
};

const ICON: Record<VerdictSeverity, typeof Info> = {
  warn: AlertTriangle,
  info: Info,
  good: Lightbulb,
};

const TONE: Record<VerdictSeverity, string> = {
  warn: "text-destructive",
  info: "text-muted-foreground",
  good: "text-success",
};

/** « Ce qui aurait pu sauver le fit » — pistes heuristiques + rappel résistances. */
export function Verdict({ pm }: { pm: PostMortem }) {
  const t = useT();
  const items = buildVerdict(pm);
  const hole = victimResistHole(pm);

  return (
    <div className="space-y-2">
      {hole && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-fleur" />
          <p className="text-sm">
            {t("loss.verdict.resistHole", {
              tank: t(`ship.tank.${hole.tank}`),
              dmg: t(DMG_KEY[hole.hole]),
            })}
            <Badge variant="outline" className="ml-2 align-middle">
              {t("loss.verdict.viaTrainer")}
            </Badge>
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t("loss.verdict.none")}</p>
      ) : (
        items.map((it, i) => {
          const Icon = ICON[it.severity];
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE[it.severity])} />
              <p className="text-sm">{t(`loss.verdict.${it.code}`, it.vars)}</p>
            </div>
          );
        })
      )}

      <p className="pt-1 text-[11px] text-muted-foreground/70">{t("loss.verdict.disclaimer")}</p>
    </div>
  );
}
