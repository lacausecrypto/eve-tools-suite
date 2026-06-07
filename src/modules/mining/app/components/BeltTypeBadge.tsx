import type { BeltType } from "@mining/data/ores";
import { useT } from "@/core/i18n";
import { Badge } from "@mining/components/ui/badge";

const ICONS: Record<BeltType, string> = {
  standard: "⛏️",
  anomaly: "🛰️",
  moon: "🌙",
  ice: "❄️",
};

const VARIANTS: Record<BeltType, "default" | "secondary" | "success" | "muted"> = {
  standard: "secondary",
  anomaly: "default",
  moon: "muted",
  ice: "success",
};

export function BeltTypeBadge({ type }: { type: BeltType }) {
  const t = useT();
  return (
    <Badge variant={VARIANTS[type]} className="gap-1">
      <span>{ICONS[type]}</span>
      {t("mining.beltType." + type)}
    </Badge>
  );
}
