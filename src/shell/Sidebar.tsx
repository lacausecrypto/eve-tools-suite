import { useState } from "react";
import { Gauge, LayoutGrid, Settings as SettingsIcon } from "lucide-react";
import { getModule } from "@/core/module/registry";
import { useWorkspace } from "@/core/workspace";
import { useAccounts } from "@/core/account";
import { useLocalized, useT } from "@/core/i18n";
import { sso } from "@/core/sso/session";
import { portraitUrl } from "@/core/images";
import { AccountDialog } from "@/shell/AccountDialog";
import { cn } from "@/lib/utils";

/** Rail latéral (façon Odoo) : favoris épinglés + Apps + Réglages + Compte. */
export function Sidebar() {
  const t = useT();
  const loc = useLocalized();
  const pinned = useWorkspace((s) => s.pinned);
  const activeId = useWorkspace((s) => s.activeId);
  const openModule = useWorkspace((s) => s.openModule);
  const openDashboard = useWorkspace((s) => s.openDashboard);
  const openTools = useWorkspace((s) => s.openTools);
  const openSettings = useWorkspace((s) => s.openSettings);

  const sessions = useAccounts((s) => s.sessions);
  const charId = useAccounts((s) => s.activeId);
  const active = sessions.find((s) => s.characterId === charId) ?? null;
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-background/60 py-3">
      <button
        onClick={openDashboard}
        title="EVE Tools"
        className="mb-1 grid size-10 place-items-center outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <img src="/emblem.png" alt="EVE Tools" className="h-8 w-8 object-contain" />
      </button>

      <RailButton
        active={activeId === "dashboard"}
        onClick={openDashboard}
        label={t("board.title")}
      >
        <Gauge className="h-5 w-5" />
      </RailButton>
      <RailButton
        active={activeId === "tools"}
        onClick={openTools}
        label={t("nav.apps")}
      >
        <LayoutGrid className="h-5 w-5" />
      </RailButton>

      {pinned.length > 0 && <div className="my-1 h-px w-8 bg-border/60" />}

      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto scrollbar-thin">
        {pinned.map((id) => {
          const mod = getModule(id);
          if (!mod) return null;
          const Icon = mod.icon;
          return (
            <RailButton
              key={id}
              active={activeId === `m:${id}`}
              onClick={() => openModule(id)}
              label={loc(mod.name)}
              accent={mod.accent}
            >
              <Icon className="h-5 w-5" style={{ color: mod.accent }} />
            </RailButton>
          );
        })}
      </div>

      <RailButton
        active={activeId === "settings"}
        onClick={openSettings}
        label={t("nav.settings")}
      >
        <SettingsIcon className="h-5 w-5" />
      </RailButton>

      <button
        onClick={() => setAccountOpen(true)}
        disabled={!sso.available()}
        title={
          sso.available() ? t("account.tooltip.available") : t("account.tooltip.desktop")
        }
        className="grid size-10 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
      >
        {active ? (
          <img
            src={portraitUrl(active.characterId, 64)}
            alt=""
            className="h-7 w-7 rounded-full ring-1 ring-fleur/50"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-semibold">
            EVE
          </span>
        )}
      </button>

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </aside>
  );
}

function RailButton({
  active,
  onClick,
  label,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "relative grid size-10 place-items-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
          style={{ background: accent ?? "hsl(var(--primary))" }}
        />
      )}
      {children}
    </button>
  );
}
