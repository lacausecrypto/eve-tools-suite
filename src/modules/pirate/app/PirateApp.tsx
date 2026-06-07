import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import {
  Star,
  X,
  Clock,
  ExternalLink,
  ChevronRight,
  Wrench,
  LoaderCircle,
  Zap,
  Activity,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  analyzeLocal,
  analyzeNetwork,
  getWatchlist,
  openExternal,
  predictFit,
  setWatchTag,
  allianceLogoUrl,
  corpLogoUrl,
  portraitUrl,
  shipIconUrl,
  shipRenderUrl,
  typeIconUrl,
  type ActivityProfile,
  type FitModule,
  type FitPrediction,
  type FitSource,
  type NetworkAnalysis,
  type PilotIntel,
  type PredictedShip,
  type ThreatLevel,
  type WatchlistEntry,
  type WatchTag,
} from "./api";

// ---------------------------------------------------------------------------
// Constantes & helpers de présentation (repris à l'identique du PBH standalone)
// ---------------------------------------------------------------------------

type FitState = "loading" | FitPrediction | { error: string };
type NetState = "loading" | NetworkAnalysis | { error: string };
type SortKey = "threat" | "name" | "sec" | "kd" | "danger" | "seen";

const THREAT_RANK: Record<ThreatLevel, number> = {
  deadly: 4,
  dangerous: 3,
  moderate: 2,
  harmless: 1,
  unknown: 0,
};

const TAG_OPTIONS: WatchTag[] = ["foe", "cyno", "spy", "friend"];
const THREAT_ORDER: ThreatLevel[] = [
  "deadly",
  "dangerous",
  "moderate",
  "harmless",
  "unknown",
];

function kdValue(p: PilotIntel): number {
  if (!p.stats) return -1;
  const { ships_destroyed: d, ships_lost: l } = p.stats;
  return l === 0 ? d : d / l;
}

function sortValue(p: PilotIntel, key: SortKey): number | string {
  switch (key) {
    case "threat":
      return THREAT_RANK[p.threat] * 1000 + (p.threat_score ?? 0);
    case "name":
      return p.name.toLowerCase();
    case "sec":
      return p.security_status ?? -99;
    case "kd":
      return kdValue(p);
    case "danger":
      return p.stats?.danger_ratio ?? -1;
    case "seen":
      return p.stats?.last_kill_at ?? -1;
  }
}

// "Last seen" à granularité mensuelle depuis l'activité zKill.
function fmtLastSeen(unix: number | null | undefined): string {
  if (unix == null) return "—";
  const now = new Date();
  const then = new Date(unix * 1000);
  const months =
    (now.getUTCFullYear() - then.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - then.getUTCMonth());
  if (months <= 0) return "this month";
  if (months === 1) return "1 mo ago";
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 yr ago" : `${years} yrs ago`;
}
// Récent = vert, vieillissant = ambre, parti depuis longtemps = atténué.
function seenClass(unix: number | null | undefined): string {
  if (unix == null) return "text-muted-foreground";
  const months = (Date.now() / 1000 - unix) / (30.44 * 86400);
  if (months <= 1) return "text-emerald-400";
  if (months < 6) return "text-amber-400";
  return "text-muted-foreground";
}

function fmtIsk(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return String(Math.round(v));
}

const CONF_BADGE: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

// Classes CSS par source ; le libellé est traduit via t("pirate.source.*").
const SOURCE_CLASS: Record<FitSource, string> = {
  own_loss: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  corp_doctrine: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  alliance_doctrine:
    "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

// Groupes de slots à afficher, dans l'ordre de fitting (libellé via t()).
const SLOT_GROUPS: { key: keyof PredictedShip; labelKey: string }[] = [
  { key: "high", labelKey: "pirate.slot.high" },
  { key: "mid", labelKey: "pirate.slot.mid" },
  { key: "low", labelKey: "pirate.slot.low" },
  { key: "rig", labelKey: "pirate.slot.rig" },
  { key: "other", labelKey: "pirate.slot.other" },
];

const THREAT_BADGE: Record<ThreatLevel, string> = {
  deadly: "bg-red-500/90 text-white border-transparent",
  dangerous: "bg-orange-500/90 text-black border-transparent",
  moderate: "bg-yellow-400/90 text-black border-transparent",
  harmless: "bg-emerald-700/80 text-emerald-50 border-transparent",
  unknown: "bg-zinc-700 text-zinc-300 border-transparent",
};
const THREAT_BAR: Record<ThreatLevel, string> = {
  deadly: "bg-red-500",
  dangerous: "bg-orange-500",
  moderate: "bg-yellow-400",
  harmless: "bg-emerald-500",
  unknown: "bg-zinc-600",
};
const TAG_BADGE: Record<WatchTag, string> = {
  foe: "bg-red-500/15 text-red-300 border-red-500/30",
  cyno: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  spy: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  friend: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const secClass = (s: number | null) =>
  s == null
    ? "text-muted-foreground"
    : s >= 0.5
      ? "text-emerald-400"
      : s > 0
        ? "text-lime-400"
        : s > -5
          ? "text-amber-400"
          : "text-red-400 font-semibold";
const fmtSec = (s: number | null) => (s == null ? "—" : s.toFixed(1));
const kd = (p: PilotIntel) => {
  if (!p.stats) return "—";
  const { ships_destroyed: d, ships_lost: l } = p.stats;
  return (l === 0 ? d : d / l).toFixed(1);
};

const isFit = (s: FitState | undefined): s is FitPrediction =>
  !!s && s !== "loading" && !("error" in s);
const fitError = (s: FitState | undefined): string | null =>
  s && s !== "loading" && "error" in s ? s.error : null;
const isNet = (s: NetState | undefined): s is NetworkAnalysis =>
  !!s && s !== "loading" && !("error" in s);

// L'heure UTC courante est-elle dans le créneau actif du pilote ?
function activeNow(a: ActivityProfile): boolean {
  return a.peak_hours.includes(new Date().getUTCHours());
}
// Hauteur de barre (%) pour l'histogramme d'activité.
function barPct(a: ActivityProfile, h: number): number {
  const max = Math.max(1, ...a.hours);
  return Math.round((a.hours[h] / max) * 100);
}

function zkillUrl(id: number) {
  return `https://zkillboard.com/character/${id}/`;
}

/** Applique les tags de la watchlist sur la liste de pilotes (immutable). */
function applyTags(
  pilots: PilotIntel[],
  watchlist: WatchlistEntry[],
): PilotIntel[] {
  const byId = new Map(watchlist.map((w) => [w.character_id, w.tag]));
  return pilots.map((p) =>
    p.character_id != null
      ? { ...p, watch_tag: byId.get(p.character_id) ?? null }
      : p,
  );
}

// ---------------------------------------------------------------------------

export function PirateApp() {
  const t = useT();
  const [pasted, setPasted] = useState("");
  const [pilots, setPilots] = useState<PilotIntel[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState<number | null>(null);

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fits, setFits] = useState<Record<number, FitState>>({});
  const [networks, setNetworks] = useState<Record<number, NetState>>({});

  const [sortKey, setSortKey] = useState<SortKey>("threat");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hideHarmless, setHideHarmless] = useState(false);
  const [foesOnly, setFoesOnly] = useState(false);
  const [search, setSearch] = useState("");

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };
  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : "";

  const displayed = useMemo(() => {
    let rows = pilots;
    if (hideHarmless)
      rows = rows.filter(
        (p) => p.threat !== "harmless" && p.threat !== "unknown",
      );
    if (foesOnly) rows = rows.filter((p) => p.watch_tag === "foe");
    const q = search.trim().toLowerCase();
    if (q)
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.corporation_name ?? "").toLowerCase().includes(q) ||
          (p.alliance_name ?? "").toLowerCase().includes(q),
      );

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      let r =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb)
          : (va as number) - (vb as number);
      if (r === 0) r = (b.threat_score ?? 0) - (a.threat_score ?? 0); // tiebreak stable
      return r * dir;
    });
  }, [pilots, hideHarmless, foesOnly, search, sortKey, sortDir]);

  const summary = useMemo(() => {
    const counts: Record<ThreatLevel, number> = {
      deadly: 0,
      dangerous: 0,
      moderate: 0,
      harmless: 0,
      unknown: 0,
    };
    for (const p of pilots) counts[p.threat]++;
    return counts;
  }, [pilots]);

  const refreshWatchlist = useCallback(async () => {
    try {
      const wl = await getWatchlist();
      setWatchlist(wl);
      setPilots((prev) => applyTags(prev, wl));
    } catch (e) {
      setErrorMsg(String(e));
    }
  }, []);

  // analyze : prend un texte explicite (hotkey) ou l'état courant.
  const loadingRef = useRef(false);
  const analyze = useCallback(
    async (override?: string) => {
      const text = (override ?? pasted).trim();
      if (!text || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setErrorMsg("");
      const start = performance.now();
      try {
        const result = await analyzeLocal(text);
        setElapsed(Math.round(performance.now() - start));
        setPilots(applyTags(result, watchlist));
      } catch (e) {
        setErrorMsg(String(e));
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [pasted, watchlist],
  );

  // Référence stable pour l'écouteur de hotkey (évite de re-souscrire).
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    refreshWatchlist();
    // La hotkey globale (Cmd/Ctrl+Shift+L) lit le presse-papiers côté Rust et
    // envoie le texte ici pour analyse, même quand EVE a le focus. Desktop seul.
    if (!isTauri()) return;
    const unlisten = listen<string>("hotkey-analyze", (e) => {
      const text = e.payload ?? "";
      setPasted(text);
      analyzeRef.current(text);
    });
    return () => {
      unlisten.then((off) => off()).catch(() => {});
    };
  }, [refreshWatchlist]);

  const onPaste = () => {
    // Le collage par défaut s'insère dans le textarea après ce handler ; on lit
    // la valeur finale du DOM au microtask suivant (comme le bind:value Svelte).
    queueMicrotask(() => {
      const v = taRef.current?.value ?? "";
      if (v.trim()) analyzeRef.current(v);
    });
  };

  const onKeydown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      analyze();
    }
  };

  const changeTag = async (p: PilotIntel, value: string | undefined) => {
    if (p.character_id == null) return;
    const id = p.character_id;
    const tag = (!value || value === "none" ? null : value) as WatchTag | null;
    setPilots((prev) =>
      prev.map((q) => (q.character_id === id ? { ...q, watch_tag: tag } : q)),
    );
    try {
      await setWatchTag(id, tag);
      await refreshWatchlist();
    } catch (e) {
      setErrorMsg(String(e));
    }
  };

  const saveNote = async (entry: WatchlistEntry) => {
    try {
      await setWatchTag(entry.character_id, entry.tag, entry.note);
    } catch (e) {
      setErrorMsg(String(e));
    }
  };

  const editNote = (id: number, note: string) =>
    setWatchlist((prev) =>
      prev.map((w) => (w.character_id === id ? { ...w, note } : w)),
    );

  const removeEntry = async (entry: WatchlistEntry) => {
    try {
      await setWatchTag(entry.character_id, null);
      await refreshWatchlist();
    } catch (e) {
      setErrorMsg(String(e));
    }
  };

  const clearAll = () => {
    setPasted("");
    setPilots([]);
    setElapsed(null);
    setErrorMsg("");
    setExpanded(new Set());
    setFits({});
    setNetworks({});
  };

  const toggleFit = async (p: PilotIntel) => {
    if (p.character_id == null) return;
    const id = p.character_id;
    let opening = false;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        opening = true;
      }
      return next;
    });
    if (!opening) return;
    if (fits[id] && fits[id] !== "loading") return; // déjà chargé
    setFits((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const f = await predictFit(id, p.corporation_id, p.alliance_id);
      setFits((prev) => ({ ...prev, [id]: f }));
    } catch (e) {
      setFits((prev) => ({ ...prev, [id]: { error: String(e) } }));
    }
  };

  const loadNetwork = async (id: number) => {
    if (networks[id]) return; // déjà en cours ou chargé
    setNetworks((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const n = await analyzeNetwork(id);
      setNetworks((prev) => ({ ...prev, [id]: n }));
    } catch (e) {
      setNetworks((prev) => ({ ...prev, [id]: { error: String(e) } }));
    }
  };

  // Marqueur cyno au niveau ligne : seulement une fois le fit récupéré & flaggé.
  const cynoFlag = (p: PilotIntel): boolean => {
    if (p.character_id == null) return false;
    const f = fits[p.character_id];
    return isFit(f) && f.cyno.suspect;
  };

  const SortHead = ({
    sk,
    label,
    extra,
  }: {
    sk: SortKey;
    label: string;
    extra?: string;
  }) => (
    <TableHead className={extra}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort(sk)}
      >
        {label}
        <span className="text-[10px] text-sky-400">{arrow(sk)}</span>
      </button>
    </TableHead>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
        {/* Barre d'action du module (le shell fournit la marque) :
            synthèse des menaces à gauche, watchlist à droite. */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {THREAT_ORDER.map((lvl) =>
            summary[lvl] > 0 ? (
              <Badge key={lvl} className={THREAT_BADGE[lvl]}>
                {summary[lvl]} {t(`pirate.threat.${lvl}`)}
              </Badge>
            ) : null,
          )}
          {elapsed != null && pilots.length > 0 && (
            <Badge variant="outline" className="text-muted-foreground">
              {t("pirate.summary.pilots", { n: pilots.length, ms: elapsed })}
            </Badge>
          )}
          <Button
            variant={showWatchlist ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWatchlist((v) => !v)}
            className="ml-auto"
          >
            <Star className="size-3.5" />
            {t("pirate.watchlist.button", { n: watchlist.length })}
          </Button>
        </div>

        {/* Panneau watchlist */}
        {showWatchlist && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {t("pirate.watchlist.title")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("pirate.watchlist.subtitle")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {watchlist.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("pirate.watchlist.empty")}
                </p>
              ) : (
                watchlist.map((entry) => (
                  <div
                    key={entry.character_id}
                    className="flex items-center gap-3"
                  >
                    <img
                      className="size-8 rounded bg-muted"
                      src={portraitUrl(entry.character_id, 32)}
                      alt=""
                      loading="lazy"
                    />
                    <button
                      className="min-w-40 text-left text-sm font-medium text-sky-400 hover:underline"
                      onClick={() => openExternal(zkillUrl(entry.character_id))}
                    >
                      {entry.name ?? `id ${entry.character_id}`}
                    </button>
                    <Badge className={cn("capitalize", TAG_BADGE[entry.tag])}>
                      {t(`pirate.tag.${entry.tag}`)}
                    </Badge>
                    <Input
                      className="h-8 flex-1"
                      value={entry.note}
                      onChange={(e) =>
                        editNote(entry.character_id, e.target.value)
                      }
                      onBlur={() => saveNote(entry)}
                      placeholder={t("pirate.watchlist.notePlaceholder")}
                      spellCheck={false}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-400"
                      onClick={() => removeEntry(entry)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Saisie */}
        <div className="mt-4 space-y-2">
          <Textarea
            ref={taRef}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeydown}
            spellCheck={false}
            className="min-h-24 font-mono text-[13px]"
            placeholder={t("pirate.input.placeholder")}
          />
          <div className="flex gap-2">
            <Button onClick={() => analyze()} disabled={loading}>
              {loading ? t("pirate.input.analyzing") : t("pirate.input.analyze")}
            </Button>
            <Button variant="outline" onClick={clearAll}>
              {t("pirate.input.clear")}
            </Button>
          </div>
        </div>

        {errorMsg && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-300">
            ⚠ {errorMsg}
          </p>
        )}

        {/* Tableau de pilotes */}
        {pilots.length > 0 ? (
          <>
            {/* Barre de filtres */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pirate.filter.search")}
                className="h-8 w-64"
                spellCheck={false}
              />
              <Button
                size="sm"
                variant={hideHarmless ? "default" : "outline"}
                onClick={() => setHideHarmless((v) => !v)}
              >
                {t("pirate.filter.hideHarmless")}
              </Button>
              <Button
                size="sm"
                variant={foesOnly ? "default" : "outline"}
                onClick={() => setFoesOnly((v) => !v)}
              >
                {t("pirate.filter.foesOnly")}
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {t("pirate.filter.count", {
                  shown: displayed.length,
                  total: pilots.length,
                })}
              </span>
            </div>

            <Card className="mt-2 overflow-hidden py-0">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortHead
                      sk="threat"
                      label={t("pirate.col.threat")}
                      extra="w-28"
                    />
                    <SortHead sk="name" label={t("pirate.col.pilot")} />
                    <TableHead>{t("pirate.col.corpAlliance")}</TableHead>
                    <SortHead
                      sk="sec"
                      label={t("pirate.col.sec")}
                      extra="text-right"
                    />
                    <SortHead
                      sk="kd"
                      label={t("pirate.col.kd")}
                      extra="text-right"
                    />
                    <SortHead
                      sk="danger"
                      label={t("pirate.col.danger")}
                      extra="text-right"
                    />
                    <SortHead
                      sk="seen"
                      label={t("pirate.col.seen")}
                      extra="text-right"
                    />
                    <TableHead className="w-[140px]">
                      {t("pirate.col.flies")}
                    </TableHead>
                    <TableHead className="w-36">{t("pirate.col.tag")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((p) => {
                    const open =
                      p.character_id != null && expanded.has(p.character_id);
                    const f =
                      p.character_id != null ? fits[p.character_id] : undefined;
                    const n =
                      p.character_id != null
                        ? networks[p.character_id]
                        : undefined;
                    return (
                      <PilotRows
                        key={p.name}
                        p={p}
                        open={!!open}
                        f={f}
                        n={n}
                        onToggleFit={toggleFit}
                        onChangeTag={changeTag}
                        onLoadNetwork={loadNetwork}
                        cyno={cynoFlag(p)}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        ) : (
          !loading && (
            <div className="mt-16 text-center text-sm text-muted-foreground">
              {t("pirate.empty")}
            </div>
          )
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Ligne pilote + panneau de fit (extrait pour lisibilité ; logique inchangée)
// ---------------------------------------------------------------------------

function PilotRows({
  p,
  open,
  f,
  n,
  onToggleFit,
  onChangeTag,
  onLoadNetwork,
  cyno,
}: {
  p: PilotIntel;
  open: boolean;
  f: FitState | undefined;
  n: NetState | undefined;
  onToggleFit: (p: PilotIntel) => void;
  onChangeTag: (p: PilotIntel, value: string | undefined) => void;
  onLoadNetwork: (id: number) => void;
  cyno: boolean;
}) {
  const t = useT();
  return (
    <>
      <TableRow className={p.character_id == null ? "opacity-50" : ""}>
        {/* Threat */}
        <TableCell>
          <div className="flex flex-col gap-1.5">
            <Badge className={cn("capitalize", THREAT_BADGE[p.threat])}>
              {t(`pirate.threat.${p.threat}`)}
            </Badge>
            {p.threat_score != null && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full", THREAT_BAR[p.threat])}
                  style={{ width: `${p.threat_score}%` }}
                />
              </div>
            )}
          </div>
        </TableCell>

        {/* Pilot */}
        <TableCell>
          <div className="flex items-center gap-1.5">
            {p.character_id != null ? (
              <>
                <button
                  className={cn(
                    "grid size-6 place-items-center rounded text-muted-foreground transition-transform hover:bg-muted hover:text-foreground",
                    open && "rotate-90",
                  )}
                  onClick={() => onToggleFit(p)}
                  title={t("pirate.row.predictFit")}
                >
                  <ChevronRight className="size-4" />
                </button>
                <img
                  className="size-8 shrink-0 rounded bg-muted"
                  src={portraitUrl(p.character_id)}
                  alt=""
                  width="32"
                  height="32"
                  loading="lazy"
                />
                <button
                  className="group inline-flex items-center gap-1 text-sm font-medium text-sky-400 hover:underline"
                  onClick={() => openExternal(zkillUrl(p.character_id!))}
                >
                  {p.name}
                  <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  {p.from_cache && (
                    <Clock className="size-3 text-muted-foreground" />
                  )}
                </button>
                {cyno && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                    title={t("pirate.row.suspectedCyno")}
                  >
                    <Zap className="size-3" /> {t("pirate.row.cyno")}
                  </span>
                )}
                {p.top_ship_class && (
                  <span
                    className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300"
                    title={t("pirate.row.notableHull")}
                  >
                    {p.top_ship_class}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="grid size-8 place-items-center rounded bg-muted text-muted-foreground">
                  ?
                </span>
                <span className="text-sm text-muted-foreground">{p.name}</span>
              </>
            )}
          </div>
        </TableCell>

        {/* Corp / Alliance */}
        <TableCell>
          {p.corporation_id != null ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <img
                  className="size-[18px] shrink-0 rounded-sm"
                  src={corpLogoUrl(p.corporation_id)}
                  alt=""
                  width="18"
                  height="18"
                  loading="lazy"
                />
                <span>{p.corporation_name ?? p.corporation_id}</span>
              </div>
              {p.alliance_id != null && (
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <img
                    className="size-[18px] shrink-0 rounded-sm"
                    src={allianceLogoUrl(p.alliance_id)}
                    alt=""
                    width="18"
                    height="18"
                    loading="lazy"
                  />
                  <span>{p.alliance_name ?? p.alliance_id}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {p.error ?? "—"}
            </span>
          )}
        </TableCell>

        <TableCell
          className={cn(
            "text-right tabular-nums",
            secClass(p.security_status),
          )}
        >
          {fmtSec(p.security_status)}
        </TableCell>
        <TableCell className="text-right tabular-nums">{kd(p)}</TableCell>
        <TableCell className="text-right tabular-nums">
          {p.stats ? p.stats.danger_ratio + "%" : "—"}
        </TableCell>
        <TableCell
          className={cn(
            "text-right whitespace-nowrap",
            seenClass(p.stats?.last_kill_at),
          )}
        >
          {fmtLastSeen(p.stats?.last_kill_at)}
        </TableCell>

        {/* Ships flown */}
        <TableCell>
          {p.stats && p.stats.top_ships.length > 0 ? (
            <div className="flex w-max gap-1">
              {p.stats.top_ships.slice(0, 4).map((ship, i) => (
                <Tooltip key={`${ship.ship_type_id}-${i}`}>
                  <TooltipTrigger asChild>
                    <img
                      className="size-7 shrink-0 cursor-pointer rounded bg-background transition-transform duration-150 ease-out hover:scale-125 hover:ring-2 hover:ring-sky-400/50"
                      src={shipIconUrl(ship.ship_type_id, 64)}
                      alt=""
                      width="28"
                      height="28"
                      loading="lazy"
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border border-border bg-card p-2 text-foreground"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <img
                        className="size-40 rounded"
                        src={shipRenderUrl(ship.ship_type_id, 256)}
                        alt=""
                      />
                      <span className="text-sm font-medium">
                        {ship.ship_name ?? `type ${ship.ship_type_id}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("pirate.row.kills", { n: ship.count })}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Tag */}
        <TableCell>
          <Select
            value={p.watch_tag ?? "none"}
            onValueChange={(v) => onChangeTag(p, v)}
            disabled={p.character_id == null}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-32 shrink-0 capitalize bg-background",
                p.watch_tag ? TAG_BADGE[p.watch_tag] : "",
              )}
            >
              <span>
                {p.watch_tag
                  ? t(`pirate.tag.${p.watch_tag}`)
                  : t("pirate.tag.placeholder")}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("pirate.tag.none")}</SelectItem>
              {TAG_OPTIONS.map((tag) => (
                <SelectItem key={tag} value={tag} className="capitalize">
                  {t(`pirate.tag.${tag}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>

      {/* Prédiction de fit (dépliable) */}
      {p.character_id != null && open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={9} className="bg-muted/20 p-0">
            <div className="px-4 py-3">
              <FitPanel p={p} f={f} n={n} onLoadNetwork={onLoadNetwork} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function FitPanel({
  p,
  f,
  n,
  onLoadNetwork,
}: {
  p: PilotIntel;
  f: FitState | undefined;
  n: NetState | undefined;
  onLoadNetwork: (id: number) => void;
}) {
  const t = useT();
  if (f === "loading" || f === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        {t("pirate.fit.loading")}
      </div>
    );
  }
  const err = fitError(f);
  if (err) return <p className="text-sm text-red-300">⚠ {err}</p>;
  if (!isFit(f)) return null;

  return (
    <>
      {/* Verdict cyno */}
      {f.cyno.suspect && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 font-medium text-amber-300">
            <Zap className="size-4" />{" "}
            {t("pirate.fit.cynoSuspect", { pct: f.cyno.score })}
          </div>
          <ul className="mt-1 ml-6 list-disc text-xs text-amber-200/80">
            {f.cyno.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Activité / primetime */}
      {f.activity.samples > 0 && (
        <div className="mb-3 rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <Activity className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("pirate.fit.activity", { n: f.activity.samples })}
            </span>
            {f.activity.tz_guess && (
              <Badge variant="outline" className="text-sky-300">
                {f.activity.tz_guess}
              </Badge>
            )}
            {activeNow(f.activity) ? (
              <Badge className="border-transparent bg-emerald-500/90 text-black">
                {t("pirate.fit.primetimeNow")}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("pirate.fit.outsidePrimetime")}
              </span>
            )}
          </div>
          <div className="flex h-10 items-end gap-px">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className={cn(
                  "flex-1 rounded-sm",
                  f.activity.peak_hours.includes(h)
                    ? "bg-sky-400"
                    : "bg-muted-foreground/40",
                )}
                style={{ height: `${Math.max(3, barPct(f.activity, h))}%` }}
                title={t("pirate.fit.hourTooltip", {
                  hour: String(h).padStart(2, "0"),
                  n: f.activity.hours[h],
                })}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Wrench className="size-3.5" />
        {t("pirate.fit.predicted", { n: f.losses_examined })}
      </div>
      {f.note && <p className="text-sm text-muted-foreground">{f.note}</p>}
      <div className="flex flex-col gap-3">
        {f.ships.map((ship) => (
          <div
            key={ship.killmail_id}
            className="rounded-lg border border-border bg-card/50 p-3"
          >
            {/* en-tête vaisseau */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <img
                className="size-8 rounded bg-background"
                src={typeIconUrl(ship.ship_type_id)}
                alt=""
                loading="lazy"
              />
              <span className="font-medium">
                {ship.ship_name ?? `type ${ship.ship_type_id}`}
              </span>
              <Badge className={SOURCE_CLASS[ship.source]}>
                {t(`pirate.source.${ship.source}`)}
              </Badge>
              <Badge
                className={cn(
                  "capitalize",
                  CONF_BADGE[ship.confidence_label] ?? CONF_BADGE.low,
                )}
              >
                {t(`pirate.conf.${ship.confidence_label}`)} · {ship.confidence}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("pirate.fit.sample", {
                  n: ship.sample_size,
                  what:
                    ship.source === "own_loss"
                      ? t("pirate.fit.lost")
                      : t("pirate.fit.flownByOrg"),
                })}
              </span>
              {ship.total_value > 0 && (
                <span className="text-xs text-muted-foreground">
                  ~{fmtIsk(ship.total_value)} ISK
                </span>
              )}
              <button
                className="ml-auto inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
                onClick={() =>
                  openExternal(
                    `https://zkillboard.com/kill/${ship.killmail_id}/`,
                  )
                }
              >
                {t("pirate.fit.killmail")} <ExternalLink className="size-3" />
              </button>
            </div>
            {/* grille de slots */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-5">
              {SLOT_GROUPS.map((group) => {
                const mods = ship[group.key] as unknown as FitModule[];
                if (!mods.length) return null;
                return (
                  <div key={group.key as string}>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(group.labelKey)}
                    </div>
                    <div className="flex flex-col gap-1">
                      {mods.map((m, i) => (
                        <div
                          key={`${m.type_id}-${i}`}
                          className="flex items-center gap-1.5 text-xs"
                          title={m.name ?? `type ${m.type_id}`}
                        >
                          <img
                            className="size-5 rounded-sm bg-background"
                            src={typeIconUrl(m.type_id, 32)}
                            alt=""
                            loading="lazy"
                          />
                          <span className="truncate">
                            {m.quantity > 1 && (
                              <span className="text-muted-foreground">
                                {m.quantity}×
                              </span>
                            )}{" "}
                            {m.name ?? `type ${m.type_id}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Réseau de gang (lazy) */}
      <div className="mt-3 border-t border-border pt-3">
        {n === undefined ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoadNetwork(p.character_id!)}
          >
            <Users className="size-3.5" /> {t("pirate.net.show")}
          </Button>
        ) : n === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />{" "}
            {t("pirate.net.loading")}
          </div>
        ) : isNet(n) ? (
          <>
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" />{" "}
              {t("pirate.net.fliesWith", { n: n.kills_examined })}
            </div>
            {n.coflyers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("pirate.net.empty")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {n.coflyers.map((c) => (
                  <button
                    key={c.character_id}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2 py-1 hover:border-sky-500/50"
                    onClick={() => openExternal(zkillUrl(c.character_id))}
                    title={t("pirate.net.openZkill")}
                  >
                    <img
                      className="size-6 rounded"
                      src={portraitUrl(c.character_id, 32)}
                      alt=""
                      loading="lazy"
                    />
                    <span className="text-xs">
                      {c.name ?? `id ${c.character_id}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ×{c.kills_together}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-red-300">⚠ {t("pirate.net.failed")}</p>
        )}
      </div>
    </>
  );
}
