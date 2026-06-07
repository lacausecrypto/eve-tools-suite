import {
  Gauge,
  LayoutGrid,
  Plus,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { getModule } from "@/core/module/registry";
import { useWorkspace, type Tab } from "@/core/workspace";
import { useLocalized, useT } from "@/core/i18n";
import { cn } from "@/lib/utils";

/** Barre d'onglets façon navigateur : outils ouverts, switch, fermeture, « + ». */
export function TabStrip() {
  const t = useT();
  const tabs = useWorkspace((s) => s.tabs);
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const closeTab = useWorkspace((s) => s.closeTab);
  const openDashboard = useWorkspace((s) => s.openDashboard);

  return (
    <div className="flex h-11 shrink-0 items-stretch gap-1 overflow-x-auto border-b border-border/60 bg-background/80 px-2 backdrop-blur scrollbar-thin">
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          active={tab.id === activeId}
          onSelect={() => setActive(tab.id)}
          onClose={tab.id === "dashboard" ? undefined : () => closeTab(tab.id)}
          settingsLabel={t("nav.settings")}
          toolsLabel={t("nav.apps")}
        />
      ))}
      <button
        onClick={openDashboard}
        title={t("tab.new")}
        aria-label={t("tab.new")}
        className="my-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
  onClose,
  settingsLabel,
  toolsLabel,
}: {
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
  settingsLabel: string;
  toolsLabel: string;
}) {
  const loc = useLocalized();
  const mod = tab.kind === "module" && tab.moduleId ? getModule(tab.moduleId) : null;
  const Icon =
    tab.kind === "dashboard"
      ? Gauge
      : tab.kind === "tools"
        ? LayoutGrid
        : tab.kind === "settings"
          ? SettingsIcon
          : mod?.icon ?? LayoutGrid;
  const label =
    tab.kind === "dashboard"
      ? "Dashboard"
      : tab.kind === "tools"
        ? toolsLabel
        : tab.kind === "settings"
          ? settingsLabel
          : mod ? loc(mod.name) : (tab.moduleId ?? "—");
  const accent = tab.kind === "module" ? mod?.accent : undefined;

  return (
    <div
      onClick={onSelect}
      role="tab"
      aria-selected={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group my-auto flex h-8 max-w-48 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-border bg-card text-foreground"
          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={accent ? { color: accent } : undefined}
      />
      <span className="truncate">{label}</span>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="×"
          className={cn(
            "ml-0.5 grid size-4 shrink-0 place-items-center rounded outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            active ? "opacity-70" : "opacity-0 group-hover:opacity-70",
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
