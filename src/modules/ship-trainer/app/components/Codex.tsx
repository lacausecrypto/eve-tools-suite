import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RACES, type HullClass, type Race } from "../data/doctrine";
import { CLASS_LABEL, CLASS_ORDER, SHIPS, type Ship } from "../data/ships";
import { ShipCard } from "./ShipCard";

type RaceFilter = Race | "all";
type ClassFilter = HullClass | "all";

/** Codex / flashcards : parcours filtrable des coques, indices masquables. */
export function Codex() {
  const t = useT();
  const [race, setRace] = useState<RaceFilter>("all");
  const [klass, setKlass] = useState<ClassFilter>("all");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const ships = useMemo(() => {
    const list = SHIPS.filter(
      (s) => (race === "all" || s.race === race) && (klass === "all" || s.class === klass),
    );
    return [...list].sort(
      (a, b) =>
        CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) ||
        a.race.localeCompare(b.race) ||
        a.name.localeCompare(b.name),
    );
  }, [race, klass]);

  const allRevealed = ships.length > 0 && ships.every((s) => revealed.has(s.typeId));

  function toggle(ship: Ship) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(ship.typeId) ? next.delete(ship.typeId) : next.add(ship.typeId);
      return next;
    });
  }

  function toggleAll() {
    setRevealed((prev) => {
      if (allRevealed) {
        const next = new Set(prev);
        ships.forEach((s) => next.delete(s.typeId));
        return next;
      }
      return new Set([...prev, ...ships.map((s) => s.typeId)]);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<RaceFilter>
          label={t("ship.codex.filter.race")}
          value={race}
          onChange={setRace}
          options={[
            { value: "all", label: t("ship.codex.all") },
            ...RACES.map((r) => ({ value: r as RaceFilter, label: r })),
          ]}
        />
        <Segmented<ClassFilter>
          label={t("ship.codex.filter.class")}
          value={klass}
          onChange={setKlass}
          options={[
            { value: "all", label: t("ship.codex.all") },
            ...CLASS_ORDER.map((c) => ({
              value: c as ClassFilter,
              label: CLASS_LABEL[c],
            })),
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {t("ship.codex.count", { n: ships.length })}
          </span>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {allRevealed ? t("ship.codex.hideAll") : t("ship.codex.revealAll")}
          </Button>
        </div>
      </div>

      {/* Grille de fiches */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ships.map((s) => (
          <ShipCard
            key={s.typeId}
            ship={s}
            revealed={revealed.has(s.typeId)}
            onToggle={() => toggle(s)}
          />
        ))}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="inline-flex flex-wrap rounded-lg border border-border/60 bg-background/40 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
