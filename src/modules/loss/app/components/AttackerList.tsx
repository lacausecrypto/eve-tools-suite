import { Crosshair } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { corpLogoUrl, portraitUrl, typeIconUrl } from "@/core/images";
import { Badge } from "@/components/ui/badge";
import type { PmAttacker } from "../api";

/** Liste des principaux infligeurs de dégâts, avec final blow et part de dégâts. */
export function AttackerList({ attackers }: { attackers: PmAttacker[] }) {
  const t = useT();
  if (attackers.length === 0) {
    return <p className="text-sm text-muted-foreground italic">{t("loss.atk.none")}</p>;
  }
  return (
    <div className="space-y-1.5">
      {attackers.map((a, i) => (
        <Row key={i} a={a} />
      ))}
    </div>
  );
}

function Row({ a }: { a: PmAttacker }) {
  const t = useT();
  const pct = Math.round(a.damage_share * 100);
  const portrait = a.character_id
    ? portraitUrl(a.character_id, 32)
    : a.corporation_id
      ? corpLogoUrl(a.corporation_id, 32)
      : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-background/40">
      {/* Barre de part de dégâts en fond */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/10"
        style={{ width: `${Math.max(2, pct)}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-2 px-2 py-1.5">
        {portrait ? (
          <img src={portrait} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded" />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {a.character_name ?? a.corporation_name ?? t("loss.atk.unknown")}
            </span>
            {a.final_blow && (
              <Badge variant="destructive" className="shrink-0 gap-1 px-1.5 py-0 text-[10px]">
                <Crosshair className="h-3 w-3" />
                {t("loss.atk.finalBlow")}
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {[a.ship_name, a.alliance_name ?? a.corporation_name]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
        {a.ship_type_id && (
          <img
            src={typeIconUrl(a.ship_type_id, 32)}
            alt={a.ship_name ?? ""}
            loading="lazy"
            title={a.ship_name ?? undefined}
            className="h-7 w-7 shrink-0 rounded"
          />
        )}
        <div className={cn("shrink-0 text-right tabular-nums")}>
          <div className="text-sm font-semibold">{pct}%</div>
          <div className="text-[10px] text-muted-foreground">
            {a.damage_done.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
