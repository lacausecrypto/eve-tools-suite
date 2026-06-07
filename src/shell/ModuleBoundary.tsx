import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/core/i18n";

interface Props {
  moduleName: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Garde-fou par module : un plantage d'un outil affiche un repli sans tuer le
 * shell ni les autres modules. `key={moduleId}` (dans App) réinitialise l'état
 * au changement d'outil.
 */
export class ModuleBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Diagnostic local uniquement (pas de télémétrie).
    console.error(`[module:${this.props.moduleName}]`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto w-full max-w-2xl px-6 py-12">
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <div className="font-semibold">
                  {t("boundary.title", { name: this.props.moduleName })}
                </div>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("boundary.body")}
                </p>
                <pre className="mt-3 max-h-32 overflow-auto rounded-md border border-border bg-background/60 p-2 text-left text-[11px] text-muted-foreground scrollbar-thin">
                  {this.state.error.message}
                </pre>
              </div>
              <Button
                variant="outline"
                onClick={() => this.setState({ error: null })}
              >
                <RotateCcw className="h-4 w-4" /> {t("boundary.retry")}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
