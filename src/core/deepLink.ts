import { isTauri } from "@/core/runtime";
import { track, type AnalyticsTool } from "@/core/analytics";
import { useWorkspace } from "@/core/workspace";
import { toast } from "@/core/toast";
import { useMarket } from "@/modules/market/app/store";
import { fetchTypeInfo } from "@/modules/market/app/api";
import { useNotificationCenter } from "@/core/notifications/store";

const TOOL_MODULES = {
  appraisal: "appraisal",
  "lp-converter": "lp",
  "loss-analyzer": "loss",
  "abyssal-appraiser": "abyssal",
  market: "market",
  trade: "trade",
  industry: "industry",
} as const;

export type DeepLinkAction = "open" | "compare" | "watch" | "alert";
export interface ProductDeepLink {
  tool: keyof typeof TOOL_MODULES;
  moduleId: (typeof TOOL_MODULES)[keyof typeof TOOL_MODULES];
  action: DeepLinkAction;
  typeId?: number;
}

/** Parse fail-closed : aucun texte libre ni contenu utilisateur n'est accepté. */
export function parseProductDeepLink(raw: string): ProductDeepLink | null {
  if (raw.length > 512) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "eve-tools-suite:" || url.hostname !== "open" || url.pathname !== "") return null;
    const tool = url.searchParams.get("tool") as keyof typeof TOOL_MODULES | null;
    if (!tool || !(tool in TOOL_MODULES)) return null;
    const actionRaw = url.searchParams.get("action") ?? "open";
    if (!["open", "compare", "watch", "alert"].includes(actionRaw)) return null;
    if (actionRaw !== "open" && tool !== "market") return null;
    const rawTypeId = url.searchParams.get("type_id");
    let typeId: number | undefined;
    if (rawTypeId != null) {
      if (!/^\d{1,9}$/.test(rawTypeId)) return null;
      typeId = Number(rawTypeId);
      if (!Number.isSafeInteger(typeId) || typeId <= 0) return null;
    }
    if (actionRaw !== "open" && typeId == null) return null;
    return { tool, moduleId: TOOL_MODULES[tool], action: actionRaw as DeepLinkAction, typeId };
  } catch {
    return null;
  }
}

async function applyDeepLink(link: ProductDeepLink): Promise<void> {
  useWorkspace.getState().openModule(link.moduleId);
  track("deep_link_opened", { tool: link.moduleId as AnalyticsTool, action: link.action });

  if (link.tool !== "market" || link.typeId == null) {
    toast.success("Données prêtes", "Collez-les dans l'outil pour continuer dans votre workspace.");
    return;
  }

  try {
    const info = await fetchTypeInfo(link.typeId);
    useMarket.getState().select(link.typeId, info.name);
    if (link.action === "watch" || link.action === "alert") {
      useMarket.getState().addToWatchlist(link.typeId);
      track("workflow_step_completed", { source: "deep_link", action: "watchlist" });
    }
    if (link.action === "alert") {
      const id = `market-type-${link.typeId}`;
      const center = useNotificationCenter.getState();
      if (!center.rules.some((rule) => rule.id === id)) {
        center.addRule({
          id,
          name: `Market · ${info.name}`,
          enabled: true,
          eventType: "market.quote.updated",
          conditions: [{ field: "typeId", operator: "eq", value: link.typeId }],
          cooldownMinutes: 30,
          onlyWhenHidden: true,
          createdAt: Date.now(),
        });
      }
      track("workflow_step_completed", { source: "deep_link", action: "create_alert" });
      useWorkspace.getState().openNotifications();
      toast.success("Alerte créée", `${info.name} est suivi localement.`);
    } else {
      toast.success(link.action === "watch" ? "Ajouté à la watchlist" : "Comparaison ouverte", info.name);
    }
  } catch {
    toast.error("Lien non ouvert", "Le type EVE demandé n'a pas pu être vérifié.");
  }
}

export async function bootDeepLinks(): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { getCurrent, onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
  const process = (urls: string[]) => {
    for (const raw of urls.slice(0, 5)) {
      const parsed = parseProductDeepLink(raw);
      if (parsed) void applyDeepLink(parsed);
    }
  };
  process((await getCurrent()) ?? []);
  return onOpenUrl(process);
}
