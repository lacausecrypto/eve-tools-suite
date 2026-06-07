import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Champ étiqueté avec indice optionnel. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>
      )}
    </div>
  );
}

/** Indicateur clé (grande valeur). */
export function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "border-fleur/40 bg-fleur/5")}>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-0.5 text-lg font-semibold tabular-nums",
            accent && "text-fleur",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

/** Statistique compacte (libellé + valeur). */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Liaison d'un champ numérique contrôlé (autorise le vide). */
export const numField = (v: number, set: (n: number) => void, min = 0) => ({
  value: Number.isFinite(v) ? v : "",
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    set(Number.isFinite(n) ? Math.max(min, n) : (NaN as unknown as number));
  },
});
