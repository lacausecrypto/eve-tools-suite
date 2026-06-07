import type { LucideIcon } from "lucide-react";
import { Card } from "@mining/components/ui/card";
import { cn } from "@mining/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "success" | "muted";
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  muted: "text-muted-foreground bg-muted",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          accentMap[accent]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums leading-tight truncate">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground truncate">{sub}</div>
        )}
      </div>
    </Card>
  );
}
