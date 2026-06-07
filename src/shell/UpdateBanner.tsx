import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/i18n";
import { checkForUpdate, installUpdate, type UpdateInfo } from "@/core/update";

type State =
  | { kind: "idle" }
  | { kind: "available"; info: UpdateInfo }
  | { kind: "downloading"; percent: number | null }
  | { kind: "error" };

/**
 * Bannière d'auto-update (desktop) : vérifie au démarrage et, si une version
 * signée est disponible, propose de l'installer. Non bloquante (coin bas-droite),
 * fermable. `checkForUpdate` est no-op hors desktop → la bannière reste invisible.
 */
export function UpdateBanner() {
  const t = useT();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Léger délai pour ne pas concurrencer le démarrage.
    const id = window.setTimeout(async () => {
      const info = await checkForUpdate();
      if (info) setState({ kind: "available", info });
    }, 3000);
    return () => window.clearTimeout(id);
  }, []);

  if (dismissed || state.kind === "idle") return null;

  async function install() {
    setState({ kind: "downloading", percent: null });
    try {
      await installUpdate((percent) => setState({ kind: "downloading", percent }));
      // L'app relance ; on n'atteint normalement pas la suite.
    } catch {
      setState({ kind: "error" });
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card p-4 shadow-xl animate-fade">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Download className="h-4 w-4 text-fleur" /> {t("update.available.title")}
        </div>
        {state.kind !== "downloading" && (
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
            title={t("update.later")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {state.kind === "available" && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("update.available.body", {
              version: state.info.version,
              current: state.info.currentVersion,
            })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={install}>
              <Download className="h-4 w-4" /> {t("update.install")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              {t("update.later")}
            </Button>
          </div>
        </>
      )}

      {state.kind === "downloading" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {state.percent == null
            ? t("update.installing")
            : t("update.downloading", { pct: state.percent })}
        </div>
      )}

      {state.kind === "error" && (
        <p className="text-xs text-destructive">{t("update.error")}</p>
      )}
    </div>
  );
}
