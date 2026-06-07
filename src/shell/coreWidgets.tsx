import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { registerCoreWidgets } from "@/core/dashboard";
import type { WidgetProps } from "@/core/module/types";
import { esiGet, esiGetAuth, esiPost } from "@/core/esi/client";
import { corpLogoUrl, portraitUrl } from "@/core/images";
import { useAccounts } from "@/core/account";
import { useT } from "@/core/i18n";
import { WidgetStat, fmtIsk } from "@/components/ui/widget";
import { cn } from "@/lib/utils";

// --- Résolution nom de personnage → id (ESI public, caché) -------------------

const idCache = new Map<string, number>();

async function resolveCharacterId(name: string): Promise<number | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (idCache.has(key)) return idCache.get(key)!;
  try {
    const res = await esiPost<{ characters?: { id: number; name: string }[] }>(
      "/universe/ids/",
      [name.trim()],
    );
    const id = res.characters?.[0]?.id ?? null;
    if (id) idCache.set(key, id);
    return id;
  } catch {
    return null;
  }
}

interface CharInfo {
  id: number;
  name: string;
  corpId: number;
  corpName?: string;
  sec?: number;
}

function Hint({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

/** Widget Personnage : portrait + infos publiques (et SP/wallet si connecté). */
function CharacterWidget({ config }: WidgetProps) {
  const t = useT();
  const sessions = useAccounts((s) => s.sessions);
  const activeId = useAccounts((s) => s.activeId);
  const active = sessions.find((s) => s.characterId === activeId) ?? null;

  const nameCfg =
    ((config.character as string) ?? "").trim() || active?.characterName || "";
  const metric = (config.metric as string) || "card";

  const [data, setData] = useState<CharInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!nameCfg) {
      setData(null);
      return;
    }
    setLoading(true);
    (async () => {
      const id = await resolveCharacterId(nameCfg);
      if (!id) {
        if (alive) {
          setData(null);
          setLoading(false);
        }
        return;
      }
      try {
        const ch = await esiGet<{
          name: string;
          corporation_id: number;
          security_status?: number;
        }>(`/characters/${id}/`);
        let corpName: string | undefined;
        try {
          corpName = (
            await esiGet<{ name: string }>(`/corporations/${ch.corporation_id}/`)
          ).name;
        } catch {
          /* nom de corpo optionnel */
        }
        if (alive)
          setData({
            id,
            name: ch.name,
            corpId: ch.corporation_id,
            corpName,
            sec: ch.security_status,
          });
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [nameCfg]);

  if (!nameCfg) return <Hint text={t("wg.char.none")} />;
  if (loading && !data) return <Hint text="…" />;
  if (!data) return <Hint text={t("wg.char.notfound")} />;

  const secTone =
    data.sec == null
      ? "default"
      : data.sec >= 0.5
        ? "success"
        : data.sec > 0
          ? "default"
          : "destructive";

  if (metric === "sec")
    return (
      <WidgetStat
        value={data.sec != null ? data.sec.toFixed(1) : "—"}
        sub={data.name}
        tone={secTone}
      />
    );

  if (metric === "corp")
    return (
      <div className="flex h-full items-center gap-3">
        <img
          src={corpLogoUrl(data.corpId, 64)}
          alt=""
          className="h-10 w-10 rounded bg-muted"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {data.corpName ?? `#${data.corpId}`}
          </div>
          <div className="text-xs text-muted-foreground">{data.name}</div>
        </div>
      </div>
    );

  if (metric === "sp" || metric === "wallet")
    return <AuthMetric char={data} metric={metric} />;

  // card (défaut)
  return (
    <div className="flex h-full items-center gap-3">
      <img
        src={portraitUrl(data.id, 128)}
        alt=""
        className="h-14 w-14 rounded-lg bg-muted ring-1 ring-fleur/40"
        loading="lazy"
      />
      <div className="min-w-0">
        <div className="truncate font-semibold">{data.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {data.corpName ?? `corp #${data.corpId}`}
        </div>
        {data.sec != null && (
          <div
            className={cn(
              "text-xs tabular-nums",
              secTone === "success"
                ? "text-success"
                : secTone === "destructive"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {t("wg.char.sec")} {data.sec.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Métrique authentifiée (SP / wallet) — nécessite une session SSO du perso. */
function AuthMetric({
  char,
  metric,
}: {
  char: CharInfo;
  metric: string;
}) {
  const t = useT();
  const sessions = useAccounts((s) => s.sessions);
  const session = sessions.find((s) => s.characterId === char.id);
  const [value, setValue] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!session) return;
    (async () => {
      try {
        if (metric === "wallet") {
          const bal = await esiGetAuth<number>(
            `/characters/${char.id}/wallet/`,
            char.id,
          );
          if (alive) setValue(fmtIsk(bal));
        } else {
          const sk = await esiGetAuth<{ total_sp: number }>(
            `/characters/${char.id}/skills/`,
            char.id,
          );
          if (alive) setValue(fmtIsk(sk.total_sp));
        }
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, char.id, metric]);

  if (!session)
    return (
      <WidgetStat value="🔒" sub={`${char.name} · ${t("wg.char.login")}`} />
    );
  if (err) return <WidgetStat value="—" sub={char.name} tone="destructive" />;
  return (
    <WidgetStat
      value={value ?? "…"}
      sub={`${char.name} · ${metric === "wallet" ? "ISK" : "SP"}`}
      tone="fleur"
    />
  );
}

registerCoreWidgets({
  owner: {
    id: "core",
    name: "Compte",
    accent: "hsl(var(--fleur))",
    icon: UserCircle2,
  },
  widgets: [
    {
      id: "character",
      title: { fr: "Personnage", en: "Character" },
      icon: UserCircle2,
      size: "md",
      config: [
        {
          key: "character",
          label: { fr: "Personnage", en: "Character" },
          type: "text",
          placeholder: "Nom du personnage",
        },
        {
          key: "metric",
          label: { fr: "Métrique", en: "Metric" },
          type: "select",
          default: "card",
          options: [
            { value: "card", label: { fr: "Carte", en: "Card" } },
            { value: "sec", label: { fr: "Sécurité", en: "Security" } },
            { value: "corp", label: { fr: "Corporation", en: "Corporation" } },
            { value: "sp", label: { fr: "Skill Points", en: "Skill Points" } },
            { value: "wallet", label: { fr: "Wallet", en: "Wallet" } },
          ],
        },
      ],
      component: CharacterWidget,
    },
  ],
});
