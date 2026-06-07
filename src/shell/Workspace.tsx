import { getModule } from "@/core/module/registry";
import { useWorkspace, type Tab } from "@/core/workspace";
import { useLocalized } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TabStrip } from "./TabStrip";
import { Dashboard } from "./Dashboard";
import { ToolsCatalog } from "./ToolsCatalog";
import { Settings } from "./Settings";
import { ModuleBoundary } from "./ModuleBoundary";
import { ComplianceFooter } from "./ComplianceFooter";
import { TourFab } from "./TourFab";

/**
 * Espace de travail multi-onglets : rail de favoris (gauche), barre d'onglets
 * (haut) et zone de contenu **keep-alive** — tous les onglets restent montés,
 * seul l'actif est visible, ce qui **préserve l'état** de chaque outil au switch.
 */
export function Workspace() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeId = useWorkspace((s) => s.activeId);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TabStrip />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "absolute inset-0 overflow-auto scrollbar-thin",
                tab.id !== activeId && "hidden",
              )}
            >
              <TabContent tab={tab} />
            </div>
          ))}
          <TourFab />
        </main>
        <ComplianceFooter />
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  const loc = useLocalized();
  if (tab.kind === "dashboard") return <Dashboard />;
  if (tab.kind === "tools") return <ToolsCatalog />;
  if (tab.kind === "settings") return <Settings />;

  const mod = tab.moduleId ? getModule(tab.moduleId) : undefined;
  if (!mod) {
    return (
      <div className="grid h-full place-items-center p-8 text-sm text-muted-foreground">
        Module introuvable.
      </div>
    );
  }
  const Module = mod.component;
  return (
    <ModuleBoundary key={mod.id} moduleName={loc(mod.name)}>
      <Module />
    </ModuleBoundary>
  );
}
