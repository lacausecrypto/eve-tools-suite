import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

/** Indicateur clé (grande valeur), couleur selon le signe optionnel. */
export function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3",
        tone === "accent" && "border-fleur/40 bg-fleur/5",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
          tone === "accent" && "text-fleur",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Section encadrée avec titre. */
export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Input numérique contrôlé (autorise le champ vide pendant la saisie). */
export function NumInput({
  value,
  onChange,
  min = 0,
  step,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  className?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(min, n) : (NaN as unknown as number));
      }}
      className={className}
    />
  );
}

/** Input de pourcentage : affiche/édite en %, stocke en fraction (0–1). */
export function PctInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (frac: number) => void;
  className?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step={0.1}
      value={Number.isFinite(value) ? +(value * 100).toFixed(4) : ""}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(0, n) / 100 : 0);
      }}
      className={className}
    />
  );
}
