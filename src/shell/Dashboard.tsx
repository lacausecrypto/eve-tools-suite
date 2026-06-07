import { useEffect, useState } from "react";
import { Check, Gauge, Pencil, Plus } from "lucide-react";
import { allWidgets, useDashboard } from "@/core/dashboard";
import { useT, useLocalized } from "@/core/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DashboardGrid } from "./DashboardGrid";

/** Tableau de bord : canvas de widgets composable (drag/resize/config). */
export function Dashboard() {
  const t = useT();
  const instances = useDashboard((s) => s.instances);
  const editing = useDashboard((s) => s.editing);
  const toggleEdit = useDashboard((s) => s.toggleEdit);
  const sync = useDashboard((s) => s.sync);
  const normalize = useDashboard((s) => s.normalize);
  const [picker, setPicker] = useState(false);

  // Ajoute les nouveaux widgets et répare les chevauchements. **Après hydratation
  // seulement** : sinon `sync` s'exécute avant le rechargement async du store
  // (instances/known vides) et recrée la disposition par défaut en écrasant celle
  // sauvegardée par l'utilisateur (course écriture/lecture du stockage).
  useEffect(() => {
    const run = () => {
      sync(allWidgets().map((w) => w.gid));
      normalize();
    };
    if (useDashboard.persist.hasHydrated()) {
      run();
      return;
    }
    return useDashboard.persist.onFinishHydration(run);
  }, [sync, normalize]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-6 animate-fade-in">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl border border-border/60 bg-fleur/10">
            <Gauge className="h-5 w-5 text-fleur" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("board.title")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {editing ? t("board.editHint") : t("board.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="outline" size="sm" onClick={() => setPicker(true)}>
              <Plus className="h-4 w-4" /> {t("board.add")}
            </Button>
          )}
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={toggleEdit}
          >
            {editing ? (
              <>
                <Check className="h-4 w-4" /> {t("board.done")}
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" /> {t("board.edit")}
              </>
            )}
          </Button>
        </div>
      </div>

      {instances.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
            <Gauge className="h-8 w-8 text-muted-foreground/50" />
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("board.empty")}
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (!editing) toggleEdit();
                setPicker(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t("board.add")}
            </Button>
          </div>
        </Card>
      ) : (
        <DashboardGrid />
      )}

      <WidgetPicker open={picker} onOpenChange={setPicker} />
    </div>
  );
}

function WidgetPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const loc = useLocalized();
  const add = useDashboard((s) => s.add);
  const entries = allWidgets();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-fleur" /> {t("board.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("board.addDesc")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-1.5 overflow-auto scrollbar-thin pr-1">
          {entries.map((e) => {
            const Icon = e.widget.icon;
            const cfg = (e.widget.config?.length ?? 0) > 0;
            return (
              <button
                key={e.gid}
                onClick={() => add(e.gid)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2 text-left outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {Icon && (
                  <Icon className="h-4 w-4 shrink-0" style={{ color: e.owner.accent }} />
                )}
                <span className="flex-1 truncate text-sm">{loc(e.widget.title)}</span>
                {cfg && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t("board.configurable")}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {loc(e.owner.name)}
                </span>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
