import type { CSSProperties } from "react";
import { cn } from "@mining/lib/utils";

interface SliderProps {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** Couleur de la piste remplie et du curseur (CSS color). */
  color?: string;
}

/** Slider natif stylé (sans dépendance), piste remplie aux couleurs du thème. */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  color = "hsl(var(--primary))",
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn("eve-slider", className)}
      style={
        {
          "--thumb": color,
          background: `linear-gradient(to right, ${color} ${pct}%, hsl(var(--muted)) ${pct}%)`,
        } as CSSProperties
      }
    />
  );
}
