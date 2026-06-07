import type { ReactNode } from "react";
import { Check, Wrench } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { Card, CardContent } from "@/components/ui/card";
import { useT, useLocalized } from "@/core/i18n";
import { StatusBadge } from "./StatusBadge";

/**
 * Gabarit d'accueil d'un module (homogène pour tous les outils). La future UI
 * complète de chaque outil remplace/complète cet écran.
 */
export function ModuleHome({
  module,
  features,
  children,
}: {
  module: ToolModule;
  features: string[];
  children?: ReactNode;
}) {
  const t = useT();
  const loc = useLocalized();
  const Icon = module.icon;
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 animate-fade-in">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60"
          style={{ background: `color-mix(in srgb, ${module.accent} 14%, transparent)` }}
        >
          <Icon className="h-7 w-7" style={{ color: module.accent }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{loc(module.name)}</h1>
            <StatusBadge status={module.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loc(module.tagline)}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
        {loc(module.description)}
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {features.map((f) => (
          <div
            key={f}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      {children ?? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Wrench className="h-5 w-5 shrink-0 text-fleur" />
            {t("moduleHome.fallback")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
