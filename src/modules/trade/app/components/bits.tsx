import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Champ numérique étiqueté (ISK / quantités / %). */
export function NumField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  allowNull,
  className,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
  allowNull?: boolean;
  className?: string;
}) {
  const parse = (s: string): number | null => {
    const cleaned = s.replace(/[\s,]/g, "");
    if (cleaned === "") return allowNull ? null : 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : value;
  };
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(parse(e.target.value))}
          placeholder={placeholder}
          spellCheck={false}
          className={suffix ? "pr-10" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

/** Barre de progression simple. */
export function ProgressBar({ frac, label }: { frac: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Petite étiquette niveau de skill 0–5 (boutons). */
export function SkillPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "h-7 w-7 rounded-md border text-xs font-medium transition-colors",
              n === value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
