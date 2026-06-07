import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { t } from "@/core/i18n";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Garde-fou **racine** : si un plantage survient hors d'un module (shell,
 * sidebar, dialogues, effets de `App`), on affiche un écran de récupération au
 * lieu d'un écran blanc. Composant volontairement autonome (pas de dépendance
 * UI lourde) pour rester rendable même si le reste de l'app est cassé.
 */
export class AppBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Diagnostic local uniquement (l'analytics ne capture pas les erreurs).
    console.error("[app]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">{t("appBoundary.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("appBoundary.body")}</p>
          <pre className="max-h-32 overflow-auto rounded-md border border-border bg-card/60 p-2 text-left text-[11px] text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
          >
            <RotateCcw className="h-4 w-4" /> {t("appBoundary.reload")}
          </button>
        </div>
      </div>
    );
  }
}
