import { useMemo, useState } from "react";
import {
  ArrowRight,
  Globe,
  Lock,
  Pin,
  PinOff,
  Search,
  ShieldCheck,
} from "lucide-react";
import { listModules } from "@/core/module/registry";
import { useWorkspace } from "@/core/workspace";
import { useT, useLocalized } from "@/core/i18n";
import type { ToolModule } from "@/core/module/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

/** Catalogue des outils (« plugin tools ») : recherche, épinglage, ouverture. */
export function ToolsCatalog() {
  const t = useT();
  const loc = useLocalized();
  const modules = listModules();
  const pinned = useWorkspace((s) => s.pinned);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return modules;
    return modules.filter(
      (m) =>
        loc(m.name).toLowerCase().includes(needle) ||
        loc(m.tagline).toLowerCase().includes(needle),
    );
  }, [modules, q, loc]);

  const pinnedMods = filtered.filter((m) => pinned.includes(m.id));
  const others = filtered.filter((m) => !pinned.includes(m.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/emblem.png" alt="" className="h-11 w-11 shrink-0 object-contain" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("tools.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("tools.subtitle")}</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("dash.search")}
            className="h-9 w-56 pl-8"
            spellCheck={false}
          />
        </div>
      </div>

      {pinnedMods.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dash.pinned")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedMods.map((m) => (
              <ToolCard key={m.id} mod={m} pinned />
            ))}
          </div>
        </section>
      )}

      <section>
        {pinnedMods.length > 0 && (
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dash.all")}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((m) => (
            <ToolCard key={m.id} mod={m} pinned={false} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("dash.noResult")}
          </p>
        )}
      </section>
    </div>
  );
}

function ToolCard({ mod, pinned }: { mod: ToolModule; pinned: boolean }) {
  const t = useT();
  const loc = useLocalized();
  const openModule = useWorkspace((s) => s.openModule);
  const togglePin = useWorkspace((s) => s.togglePin);
  const Icon = mod.icon;
  const disabled = mod.status === "soon";
  const open = () => !disabled && openModule(mod.id);

  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={t("launcher.openAria", { name: loc(mod.name) })}
      onClick={open}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group relative overflow-hidden p-5 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20",
      )}
    >
      <div className="absolute inset-x-0 -top-px h-px opacity-70" style={{ background: mod.accent }} />

      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 transition-transform duration-150 group-hover:scale-105"
          style={{ background: `color-mix(in srgb, ${mod.accent} 14%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color: mod.accent }} />
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={mod.status} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePin(mod.id);
            }}
            title={pinned ? t("dash.unpin") : t("dash.pin")}
            aria-label={pinned ? t("dash.unpin") : t("dash.pin")}
            className={cn(
              "grid size-7 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              pinned
                ? "text-fleur hover:bg-fleur/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="font-semibold">{loc(mod.name)}</div>
        <div className="text-xs text-muted-foreground">{loc(mod.tagline)}</div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
        {loc(mod.description)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        {mod.esi.publicEsi && (
          <span className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5">
            <Globe className="h-3 w-3" /> {t("launcher.tag.publicEsi")}
          </span>
        )}
        {mod.esi.auth && (
          <span className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5">
            <Lock className="h-3 w-3" /> {t("launcher.tag.sso")}
          </span>
        )}
        {mod.esi.eulaSafe && (
          <span className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-success">
            <ShieldCheck className="h-3 w-3" /> {t("launcher.tag.eulaSafe")}
          </span>
        )}
      </div>

      {!disabled && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {t("launcher.open")}{" "}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      )}
    </Card>
  );
}
