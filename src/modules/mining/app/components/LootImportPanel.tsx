import { useEffect, useMemo, useState } from "react";
import {
  ClipboardPaste,
  Trash2,
  RefreshCw,
  Pickaxe,
  AlertCircle,
  Boxes,
  Gem,
  Clock,
  Recycle,
  History,
  ChevronDown,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import { minedSummary, consumablesSummary, refineSummary } from "@mining/lib/domain";
import { consumableShortLabel } from "@mining/data/consumables";
import { parseBroadcast, distinctMiners } from "@mining/lib/lootParser";
import {
  fetchOrePricesBoth,
  clearPriceCaches,
  type PriceResult,
  type PriceSource,
} from "@mining/lib/prices";
import type { ValuationForm } from "@mining/types";
import { formatIsk } from "@mining/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Input } from "@mining/components/ui/input";
import { Badge } from "@mining/components/ui/badge";
import { RefineYieldControl } from "@mining/components/RefineYieldControl";
import { LootHistoryDialog } from "@mining/components/LootHistoryDialog";
import { cn } from "@mining/lib/utils";

const fmtQty = (n: number) => n.toLocaleString("fr-FR");

/** Horloge temps EVE (= UTC), pour lever toute ambiguïté de fuseau (FR/CA…). */
function EveClock() {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const hms = new Date(now).toISOString().slice(11, 19);
  return (
    <span
      title={t("mining.loot.eveClockTitle")}
      className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums"
    >
      <Clock className="h-3.5 w-3.5 text-fleur" /> EVE {hms} UTC
    </span>
  );
}

export function LootImportPanel({ session }: { session: Session }) {
  const t = useT();
  const addLootEvents = useStore((s) => s.addLootEvents);
  const addFleetEvents = useStore((s) => s.addFleetEvents);
  const syncMinersToRoster = useStore((s) => s.syncMinersToRoster);
  const applyBroadcastPresence = useStore((s) => s.applyBroadcastPresence);
  const clearLoot = useStore((s) => s.clearLoot);
  const setOrePrice = useStore((s) => s.setOrePrice);
  const setOrePrices = useStore((s) => s.setOrePrices);
  const setValuationForm = useStore((s) => s.setValuationForm);

  const readOnly = session.status === "ended";
  const form = session.valuationForm ?? "raw";
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [consOpen, setConsOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [sources, setSources] = useState<Record<string, PriceSource>>({});
  // Cache des prix pour les deux formes (récupérés en une passe).
  const [bothPrices, setBothPrices] = useState<{
    raw: PriceResult;
    compressed: PriceResult;
  } | null>(null);

  const summary = useMemo(() => minedSummary(session), [session]);
  const consumables = useMemo(() => consumablesSummary(session), [session]);
  const refine = useMemo(() => refineSummary(session), [session]);
  // Minerais + cristaux + quantités extraites → prix Jita effectif selon la quantité.
  const oreQtys = useMemo(
    () => [
      ...summary.oreTotals.map((o) => ({ ore: o.ore, qty: o.qty })),
      ...consumables.items.map((c) => ({ ore: c.name, qty: c.totalQty })),
    ],
    [summary, consumables]
  );

  function doImport() {
    const { events, fleetEvents, matchedLines } = parseBroadcast(text);
    if (matchedLines === 0) {
      setFeedback(t("mining.loot.fb.noLine"));
      return;
    }
    const added = addLootEvents(session.id, events);
    const dups = events.length - added;
    // Crée les membres UNIQUEMENT depuis les récoltes (jamais depuis join/leave).
    const { newMembers, newParticipants } = syncMinersToRoster(
      session.id,
      distinctMiners(events)
    );
    // Entrées/sorties de flotte → pause/reprise (membres existants seulement).
    const fleetAdded = addFleetEvents(session.id, fleetEvents);
    applyBroadcastPresence(session.id);
    const extra: string[] = [];
    if (dups > 0) extra.push(t("mining.loot.fb.dups", { n: dups }));
    if (newMembers > 0) extra.push(t("mining.loot.fb.newMembers", { n: newMembers }));
    else if (newParticipants > 0)
      extra.push(t("mining.loot.fb.newParticipants", { n: newParticipants }));
    if (fleetAdded > 0) extra.push(t("mining.loot.fb.fleet", { n: fleetAdded }));
    setFeedback(
      extra.length
        ? t("mining.loot.fb.addedExtra", { n: added, extra: extra.join(" · ") })
        : t("mining.loot.fb.addedPlain", { n: added })
    );
    setText("");
    setBothPrices(null); // le set de minerais a changé → cache prix invalidé
  }

  /** Applique au store les prix d'une forme depuis le cache (bascule instantanée). */
  function applyForm(
    f: ValuationForm,
    both: { raw: PriceResult; compressed: PriceResult } | null = bothPrices
  ) {
    if (!both) return;
    const res = f === "compressed" ? both.compressed : both.raw;
    setOrePrices(session.id, res.prices);
    setSources(res.sources);
    const approx = Object.values(res.sources).filter(
      (s) => s === "base" || s === "sell"
    ).length;
    const parts: string[] = [];
    if (approx > 0) parts.push(t("mining.loot.fb.approx", { n: approx }));
    if (res.missing.length > 0)
      parts.push(t("mining.loot.fb.missing", { list: res.missing.join(", ") }));
    setPriceError(parts.length ? parts.join(" · ") : null);
  }

  async function fetchPrices(targetForm: ValuationForm = form) {
    if (oreQtys.length === 0) return;
    setFetching(true);
    setPriceError(null);
    try {
      clearPriceCaches(); // refresh marché à chaque "Prix Jita"
      const both = await fetchOrePricesBoth(oreQtys);
      setBothPrices(both);
      applyForm(targetForm, both);
    } catch {
      setPriceError(t("mining.loot.fb.fetchError"));
    } finally {
      setFetching(false);
    }
  }

  const hasLoot = (session.lootEvents?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-primary" />
          {t("mining.loot.title")}
          {hasLoot && (
            <Badge variant="success" className="tabular-nums">
              {t("mining.loot.summary", {
                miners: summary.miners.length,
                qty: fmtQty(summary.totalQty),
              })}
            </Badge>
          )}
        </CardTitle>
        {hasLoot && (
          <div className="flex items-center gap-1">
            <LootHistoryDialog
              session={session}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <History className="h-4 w-4" /> {t("mining.loot.history")}
                </Button>
              }
            />
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => clearLoot(session.id)}
              >
                <Trash2 className="h-4 w-4" /> {t("mining.loot.clear")}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFeedback(null);
              }}
              placeholder={t("mining.loot.placeholder")}
              className="min-h-[96px] w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring scrollbar-thin"
            />
            <div className="flex items-center gap-2">
              <Button onClick={doImport} disabled={!text.trim()}>
                <ClipboardPaste className="h-4 w-4" /> {t("mining.loot.import")}
              </Button>
              {feedback && (
                <span className="text-xs text-muted-foreground">{feedback}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
              <EveClock />
              <span className="opacity-60">·</span>
              <span>{t("mining.loot.utcHint")}</span>
            </div>
          </div>
        )}

        {!hasLoot ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pickaxe className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("mining.loot.empty")}</p>
          </div>
        ) : (
          <>
            {/* Forme de valorisation : brut / compressé */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-3.5 w-3.5" /> {t("mining.loot.valueAs")}
                <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
                  {[
                    { v: "raw" as const, label: t("mining.loot.raw") },
                    { v: "compressed" as const, label: t("mining.loot.compressed") },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      disabled={readOnly}
                      onClick={() => {
                        if (opt.v === form) return;
                        setValuationForm(session.id, opt.v);
                        // bascule instantanée depuis le cache, sinon on fetch
                        if (bothPrices) applyForm(opt.v);
                        else fetchPrices(opt.v);
                      }}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        form === opt.v
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPrices()}
                  disabled={fetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`}
                  />
                  {t("mining.loot.jitaPrice")}
                </Button>
              )}
            </div>

            {/* Tableau prix groupé par catégorie, un prix par grade */}
            <div className="space-y-3">
              {summary.oreGroups.map((g) => (
                <div key={g.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("mining.cat." + g.category)}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {fmtQty(g.qty)} u · {formatIsk(g.value)} ISK
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {g.ores.map((o) => (
                      <div
                        key={o.ore}
                        className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1">
                            {o.base}
                            {o.grade > 0 && (
                              <Badge
                                variant="muted"
                                className="text-[9px] px-1 py-0"
                              >
                                {["", "I", "II", "III", "IV"][o.grade]}
                              </Badge>
                            )}
                            {(sources[o.ore] === "base" ||
                              sources[o.ore] === "sell") && (
                              <span
                                title={
                                  sources[o.ore] === "base"
                                    ? t("mining.loot.approxBase")
                                    : t("mining.loot.approxSell")
                                }
                                className="text-[10px] text-fleur"
                              >
                                ≈
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {fmtQty(o.qty)} u
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={session.orePrices?.[o.ore] ?? ""}
                          placeholder="0"
                          disabled={readOnly}
                          onChange={(e) =>
                            setOrePrice(
                              session.id,
                              o.ore,
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-7 w-20 text-right font-mono text-xs shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {priceError && (
                <p className="flex items-center gap-1.5 text-[11px] text-fleur">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {priceError}
                </p>
              )}
            </div>

            {/* Consommables : cristaux de minage (suivis à part, hors payout) */}
            {consumables.hasAny && (
              <div className="rounded-lg border border-fleur/25 bg-fleur/5 p-3 space-y-2">
                <button
                  onClick={() => setConsOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-fleur flex items-center gap-1.5">
                    <Gem className="h-3.5 w-3.5" /> {t("mining.loot.consTitle")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {fmtQty(consumables.totalQty)} u · {formatIsk(consumables.totalValue)} ISK
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-fleur transition-transform",
                        consOpen && "rotate-180"
                      )}
                    />
                  </span>
                </button>
                {consOpen && (
                <>
                <p className="text-[10px] text-muted-foreground">
                  {t("mining.loot.consNote")}
                </p>
                <div className="space-y-1.5">
                  {consumables.items.map((c) => (
                    <div
                      key={c.name}
                      className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {consumableShortLabel(c.name)}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {fmtQty(c.totalQty)} u
                            {c.price > 0 && ` · ${formatIsk(c.value)} ISK`}
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={session.orePrices?.[c.name] ?? ""}
                          placeholder="0"
                          disabled={readOnly}
                          onChange={(e) =>
                            setOrePrice(
                              session.id,
                              c.name,
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-7 w-20 text-right font-mono text-xs shrink-0"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.byMiner.map((b) => (
                          <Badge
                            key={b.miner}
                            variant="muted"
                            className="text-[9px] px-1.5 py-0 gap-1 tabular-nums"
                          >
                            {b.miner}
                            <span className="text-fleur">
                              {b.pct.toFixed(0)}%
                            </span>
                            <span className="text-muted-foreground">
                              ({fmtQty(b.qty)})
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                </>
                )}
              </div>
            )}

            {/* Retraitement : minéraux produits (rendement configurable) */}
            {refine.hasAny && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2.5">
                <button
                  onClick={() => setRefineOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
                    <Recycle className="h-3.5 w-3.5" /> {t("mining.loot.refineTitle")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {t("mining.loot.refineYield", {
                        pct: (session.refinePct ?? 100).toFixed(
                          (session.refinePct ?? 100) % 1 === 0 ? 0 : 1
                        ),
                      })}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-primary transition-transform",
                        refineOpen && "rotate-180"
                      )}
                    />
                  </span>
                </button>
                {refineOpen && (
                  <>
                    <RefineYieldControl session={session} />
                    <div className="flex flex-wrap gap-1.5">
                      {refine.minerals.map((m) => (
                        <span
                          key={m.name}
                          className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs tabular-nums"
                        >
                          <span className="text-muted-foreground">{m.name}</span>{" "}
                          <span className="font-semibold">
                            {fmtQty(Math.round(m.qty))}
                          </span>
                        </span>
                      ))}
                    </div>
                    {refine.miners.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {refine.miners.map((m) => (
                          <Badge
                            key={m.miner}
                            variant="muted"
                            className="text-[9px] px-1.5 py-0 gap-1 tabular-nums"
                          >
                            {m.miner}
                            <span className="text-primary">
                              {m.pct.toFixed(0)}%
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!summary.hasPrices && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-fleur" />
                {t("mining.loot.noPrices")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
