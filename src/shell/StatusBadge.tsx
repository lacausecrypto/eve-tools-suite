import { Badge } from "@/components/ui/badge";
import { useT } from "@/core/i18n";
import type { ToolStatus } from "@/core/module/types";

const KEY: Record<ToolStatus, string> = {
  stable: "status.stable",
  beta: "status.beta",
  soon: "status.soon",
};

const VARIANT: Record<ToolStatus, "success" | "fleur" | "muted"> = {
  stable: "success",
  beta: "fleur",
  soon: "muted",
};

export function StatusBadge({ status }: { status: ToolStatus }) {
  const t = useT();
  return <Badge variant={VARIANT[status]}>{t(KEY[status])}</Badge>;
}
