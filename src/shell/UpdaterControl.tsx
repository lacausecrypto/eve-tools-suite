import { useState } from "react";
import { Check, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/i18n";
import { isTauri } from "@/core/runtime";
import { checkForUpdate, installUpdate, type UpdateInfo } from "@/core/update";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; info: UpdateInfo }
  | { kind: "downloading"; percent: number | null }
  | { kind: "error" };

/**
 * Contrôle de mise à jour pour les Réglages : bouton « Vérifier », puis, si une
 * version est disponible, « Installer v… » (avec progression). Desktop only.
 */
export function UpdaterControl() {
  const t = useT();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function check() {
    setState({ kind: "checking" });
    const info = await checkForUpdate();
    setState(info ? { kind: "available", info } : { kind: "uptodate" });
  }

  async function install() {
    setState({ kind: "downloading", percent: null });
    try {
      await installUpdate((percent) => setState({ kind: "downloading", percent }));
    } catch {
      setState({ kind: "error" });
    }
  }

  if (!isTauri()) {
    return <span className="text-xs text-muted-foreground">{t("settings.update.desktopOnly")}</span>;
  }

  switch (state.kind) {
    case "checking":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("update.checking")}
        </span>
      );
    case "downloading":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {state.percent == null
            ? t("update.installing")
            : t("update.downloading", { pct: state.percent })}
        </span>
      );
    case "available":
      return (
        <Button size="sm" onClick={install}>
          <Download className="h-4 w-4" /> {t("update.install.v", { version: state.info.version })}
        </Button>
      );
    case "uptodate":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-success">
          <Check className="h-3.5 w-3.5" /> {t("update.uptodate")}
        </span>
      );
    case "error":
      return (
        <Button size="sm" variant="outline" onClick={check}>
          <RefreshCw className="h-4 w-4" /> {t("update.error.retry")}
        </Button>
      );
    default:
      return (
        <Button size="sm" variant="outline" onClick={check}>
          <RefreshCw className="h-4 w-4" /> {t("update.check")}
        </Button>
      );
  }
}
