import { useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Package,
  AlertCircle,
  History,
  ChevronDown,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import { stockSummary } from "@mining/lib/domain";
import { parseStock } from "@mining/lib/stockParser";
import { fetchOrePrices, clearPriceCaches } from "@mining/lib/prices";
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
import { StockHistoryDialog } from "@mining/components/StockHistoryDialog";
import { cn } from "@mining/lib/utils";

const fmtQty = (n: number) => n.toLocaleString("fr-FR");

export function StockPanel({ session }: { session: Session }) {
  const t = useT();
  const addStock = useStore((s) => s.addStock);
  const subtractStock = useStore((s) => s.subtractStock);
  const clearStock = useStore((s) => s.clearStock);
  const setStockPrice = useStore((s) => s.setStockPrice);
  const setStockPrices = useStore((s) => s.setStockPrices);

  const readOnly = session.status === "ended";
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  // Replié par défaut quand il y a déjà du stock (pour aérer) ; ouvert si vide.
  const [open, setOpen] = useState(() => (session.stock?.length ?? 0) === 0);

  const summary = useMemo(() => stockSummary(session), [session]);
  const hasStock = summary.hasAny;

  function doImport(mode: "add" | "subtract") {
    const { items, matchedLines } = parseStock(text);
    if (matchedLines === 0) {
      setFeedback(t("mining.stock.noLine"));
      return;
    }
    if (mode === "add") {
      addStock(session.id, items);
      setFeedback(t("mining.stock.added", { n: matchedLines }));
    } else {
      subtractStock(session.id, items);
      setFeedback(t("mining.stock.removed", { n: matchedLines }));
    }
    setText("");
  }

  async function fetchPrices() {
    if (summary.items.length === 0) return;
    setFetching(true);
    setPriceError(null);
    try {
      clearPriceCaches();
      const res = await fetchOrePrices(
        summary.items.map((i) => ({ ore: i.name, qty: i.qty })),
        "raw"
      );
      setStockPrices(session.id, res.prices);
      if (res.missing.length > 0)
        setPriceError(t("mining.stock.missing", { list: res.missing.join(", ") }));
    } catch {
      setPriceError(t("mining.stock.fetchError"));
    } finally {
      setFetching(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
            <Package className="h-4 w-4 text-fleur" />
            {t("mining.stock.title")}
          </button>
          {hasStock && (
            <Badge variant="muted" className="tabular-nums">
              {t("mining.stock.summary", {
                n: summary.items.length,
                isk: formatIsk(summary.totalValue),
              })}
            </Badge>
          )}
        </CardTitle>
        {hasStock && (
          <div className="flex items-center gap-1">
            <StockHistoryDialog
              session={session}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <History className="h-4 w-4" /> {t("mining.stock.history")}
                </Button>
              }
            />
            {!readOnly && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => clearStock(session.id)}
              >
                <Trash2 className="h-4 w-4" /> {t("mining.stock.clear")}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      {open && (
      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFeedback(null);
              }}
              placeholder={t("mining.stock.placeholder")}
              className="min-h-[88px] w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring scrollbar-thin"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => doImport("add")} disabled={!text.trim()}>
                <Plus className="h-4 w-4" /> {t("mining.stock.add")}
              </Button>
              <Button
                variant="outline"
                onClick={() => doImport("subtract")}
                disabled={!text.trim()}
                title={t("mining.stock.subtractTitle")}
              >
                <Minus className="h-4 w-4" /> {t("mining.stock.subtract")}
              </Button>
              {feedback && (
                <span className="text-xs text-muted-foreground">{feedback}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("mining.stock.hint.lead")}
              <strong>{t("mining.stock.hint.add")}</strong>
              {t("mining.stock.hint.mid")}
              <strong>{t("mining.stock.hint.subtract")}</strong>
              {t("mining.stock.hint.tail")}
            </p>
          </div>
        )}

        {!hasStock ? (
          <div className="text-center py-8 text-muted-foreground">
            <Boxes className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{t("mining.stock.empty")}</p>
          </div>
        ) : (
          <>
            {!readOnly && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchPrices}
                  disabled={fetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`}
                  />
                  {t("mining.stock.jitaPrice")}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              {summary.items.map((it) => (
                <div
                  key={it.name}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.name}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {fmtQty(it.qty)} u
                      {it.price > 0 && ` · ${formatIsk(it.value)} ISK`}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={session.stockPrices?.[it.name] ?? ""}
                    placeholder="0"
                    disabled={readOnly}
                    onChange={(e) =>
                      setStockPrice(session.id, it.name, Number(e.target.value) || 0)
                    }
                    className="h-7 w-24 text-right font-mono text-xs shrink-0"
                  />
                </div>
              ))}
            </div>

            {priceError && (
              <p className="flex items-center gap-1.5 text-[11px] text-fleur">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {priceError}
              </p>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Package className="h-4 w-4" /> {t("mining.stock.totalValue")}
              </span>
              <span className="font-semibold tabular-nums text-fleur">
                {formatIsk(summary.totalValue)} ISK
              </span>
            </div>
          </>
        )}
      </CardContent>
      )}
    </Card>
  );
}
