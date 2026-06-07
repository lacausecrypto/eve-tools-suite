import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToasts, type ToastKind } from "@/core/toast";
import { cn } from "@/lib/utils";

const ICON: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
};
const ACCENT: Record<ToastKind, string> = {
  info: "text-fleur",
  success: "text-success",
  error: "text-destructive",
};

/** Pile de toasts (bas-droite), montée une fois dans le shell. */
export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-card/95 p-3 shadow-xl animate-fade-in backdrop-blur"
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ACCENT[t.kind])} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
