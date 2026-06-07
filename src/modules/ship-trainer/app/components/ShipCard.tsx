import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { typeIconUrl, typeRenderUrl } from "@/core/images";
import { Badge } from "@/components/ui/badge";
import {
  WEAPON_LABEL,
  resistHole,
  sensorOf,
  type Damage,
} from "../data/doctrine";
import { CLASS_LABEL, type Ship } from "../data/ships";

/** Libellé FR d'un type de dégât. */
const DMG_KEY: Record<Damage, string> = {
  EM: "ship.dmg.EM",
  Thermal: "ship.dmg.Thermal",
  Kinetic: "ship.dmg.Kinetic",
  Explosive: "ship.dmg.Explosive",
};

/**
 * Flashcard d'une vaisseau : rendu officiel + attributs dérivés. `revealed`
 * contrôle l'affichage des indices (mode étude). Clic = bascule locale.
 */
export function ShipCard({
  ship,
  revealed,
  onToggle,
}: {
  ship: Ship;
  revealed: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);
  const hole = resistHole(ship.tank);
  const sensor = sensorOf(ship.race);

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={revealed}
        className="group relative block w-full aspect-video bg-background/40 overflow-hidden"
      >
        <img
          src={imgFailed ? typeIconUrl(ship.typeId, 64) : typeRenderUrl(ship.typeId, 256)}
          alt={revealed ? ship.name : t("ship.codex.flip")}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className={cn(
            "h-full w-full object-contain transition-all duration-200",
            !revealed && "blur-[1.5px] opacity-80 group-hover:opacity-100",
          )}
        />
        {!revealed && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <HelpCircle className="h-6 w-6" />
            <span className="text-xs">{t("ship.codex.flip")}</span>
          </span>
        )}
        <span className="absolute left-2 top-2">
          <Badge variant="muted">{CLASS_LABEL[ship.class]}</Badge>
        </span>
      </button>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold truncate">
            {revealed ? ship.name : "•••"}
          </span>
          {revealed && <Badge variant="outline">{ship.race}</Badge>}
        </div>

        {revealed ? (
          <>
            <p className="text-xs text-muted-foreground">{ship.role}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <Attr label={t("ship.attr.sensor")} value={sensor} />
              <Attr label={t("ship.attr.weapon")} value={WEAPON_LABEL[ship.weapon]} />
              <Attr
                label={t("ship.attr.tank")}
                value={t(`ship.tank.${ship.tank}`)}
              />
              <Attr label={t("ship.attr.hole")} value={t(DMG_KEY[hole])} accent />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {t("ship.codex.flip")}
          </p>
        )}
      </div>
    </div>
  );
}

function Attr({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium truncate", accent && "text-primary")}>
        {value}
      </span>
    </div>
  );
}
