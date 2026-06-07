import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { isTauri } from "@/core/runtime";
import { useAccounts } from "@/core/account";
import { resolveNames } from "@/core/universe";
import { typeIconUrl } from "@/core/images";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PriceBasis, PriceMap } from "../lib/industry";
import { buildPriceMap, resolveTypeIds } from "../lib/market";
import { parseQtyList } from "../lib/parse";
import { fetchAssets, fetchWalletTransactions } from "../api";
import { fifoCostBasis, type CostBasis } from "../lib/fifo";
import { fmtInt, fmtIsk } from "../lib/format";
import { Kpi } from "./bits";

interface Item {
  typeId: number;
  name: string;
  qty: number;
}

type Status = "idle" | "loading" | "error" | "done";

export function Assets() {
  const t = useT();
  const activeId = useAccounts((s) => s.activeId);

  const [pasteText, setPasteText] = useState("");
  const [basis, setBasis] = useState<PriceBasis>("sell");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});

  async function valuate(input: Item[]) {
    const ids = input.map((i) => i.typeId).filter((id) => id > 0);
    const pm = await buildPriceMap(ids);
    setItems(input);
    setPrices(pm);
    setStatus("done");
  }

  async function runPaste() {
    const parsed = parseQtyList(pasteText);
    if (!parsed.length) return;
    setStatus("loading");
    setError(null);
    try {
      const idMap = await resolveTypeIds(parsed.map((p) => p.name));
      const input: Item[] = parsed.map((p) => {
        const r = idMap.get(p.name.trim().toLowerCase());
        return { typeId: r?.id ?? 0, name: r?.name ?? p.name, qty: p.qty };
      });
      await valuate(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  async function runEsi() {
    if (activeId == null) {
      setError(t("ind.assets.needChar"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const raw = await fetchAssets(activeId);
      // Agrège les quantités par type.
      const byType = new Map<number, number>();
      for (const a of raw) byType.set(a.type_id, (byType.get(a.type_id) ?? 0) + a.quantity);
      const ids = [...byType.keys()];
      const names = await resolveNames(ids);
      const input: Item[] = ids.map((id) => ({
        typeId: id,
        name: names.get(id)?.name ?? `#${id}`,
        qty: byType.get(id) ?? 0,
      }));
      await valuate(input);
    } catch (e) {
      setError(
        isTauri() ? (e instanceof Error ? e.message : String(e)) : t("ind.assets.desktop"),
      );
      setStatus("error");
    }
  }

  const { lines, total, missing } = useMemo(() => {
    const lines = items
      .map((it) => {
        const unit = it.typeId ? (prices[it.typeId]?.[basis] ?? 0) : 0;
        return { ...it, unit, value: unit * it.qty };
      })
      .sort((a, b) => b.value - a.value);
    const total = lines.reduce((s, l) => s + l.value, 0);
    const missing = lines.filter((l) => l.value === 0).length;
    return { lines, total, missing };
  }, [items, prices, basis]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      {/* Entrée */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("ind.assets.paste")}</h3>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t("ind.assets.paste.ph")}
            rows={8}
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button onClick={runPaste} disabled={!pasteText.trim() || status === "loading"}>
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("ind.assets.valuate")}
            </Button>
            <BasisToggle value={basis} onChange={setBasis} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold">{t("ind.assets.esi")}</h3>
          <p className="text-xs text-muted-foreground">{t("ind.assets.esi.hint")}</p>
          <Button variant="outline" size="sm" onClick={runEsi} disabled={status === "loading"}>
            <Download className="h-4 w-4" />
            {t("ind.assets.import")}
          </Button>
        </div>

        <CostBasisPanel activeId={activeId} />
      </div>

      {/* Résultat */}
      <div className="space-y-3">
        {status === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {status === "done" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label={t("ind.assets.total")} value={fmtIsk(total)} tone="accent" />
              <Kpi label={t("ind.assets.lines")} value={fmtInt(lines.length)} />
            </div>
            {missing > 0 && (
              <p className="text-xs text-muted-foreground">{t("ind.assets.missing", { n: missing })}</p>
            )}
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="max-h-[60vh] space-y-1 overflow-auto text-sm scrollbar-thin">
                {lines.map((l) => (
                  <div key={l.typeId + l.name} className="flex items-center gap-2">
                    {l.typeId > 0 && (
                      <img src={typeIconUrl(l.typeId, 32)} alt="" className="h-5 w-5 shrink-0 rounded" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {fmtInt(l.qty)} × {fmtIsk(l.unit)}
                    </span>
                    <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                      {fmtIsk(l.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {status === "idle" && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {t("ind.assets.hint")}
          </div>
        )}
      </div>
    </div>
  );
}

function CostBasisPanel({ activeId }: { activeId: number | null }) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<{ cb: CostBasis; name: string }[]>([]);
  const [realized, setRealized] = useState(0);

  async function run() {
    if (activeId == null) {
      setError(t("ind.assets.needChar"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const txns = await fetchWalletTransactions(activeId);
      const map = fifoCostBasis(txns);
      const names = await resolveNames([...map.keys()]);
      const list = [...map.values()]
        .map((cb) => ({ cb, name: names.get(cb.typeId)?.name ?? `#${cb.typeId}` }))
        .filter((r) => r.cb.remainingQty > 0 || r.cb.soldQty > 0)
        .sort((a, b) => b.cb.remainingCost - a.cb.remainingCost);
      setRows(list);
      setRealized([...map.values()].reduce((s, c) => s + c.realizedProfit, 0));
      setStatus("done");
    } catch (e) {
      setError(isTauri() ? (e instanceof Error ? e.message : String(e)) : t("ind.assets.desktop"));
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold">{t("ind.fifo.title")}</h3>
      <p className="text-xs text-muted-foreground">{t("ind.fifo.hint")}</p>
      <Button variant="outline" size="sm" onClick={run} disabled={status === "loading"}>
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {t("ind.fifo.compute")}
      </Button>
      {status === "error" && <p className="text-xs text-destructive">{error}</p>}
      {status === "done" && (
        <div className="space-y-2 pt-1">
          <div className="text-sm">
            {t("ind.fifo.realized")}{" "}
            <span className={cn("font-semibold", realized >= 0 ? "text-success" : "text-destructive")}>
              {fmtIsk(realized)}
            </span>
          </div>
          <div className="max-h-64 space-y-1 overflow-auto text-xs scrollbar-thin">
            {rows.slice(0, 60).map((r) => (
              <div key={r.cb.typeId} className="flex items-center gap-2">
                <img src={typeIconUrl(r.cb.typeId, 32)} alt="" className="h-4 w-4 rounded" />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {fmtInt(r.cb.remainingQty)} @ {fmtIsk(r.cb.avgCost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BasisToggle({
  value,
  onChange,
}: {
  value: PriceBasis;
  onChange: (b: PriceBasis) => void;
}) {
  const t = useT();
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
      {(["buy", "sell"] as PriceBasis[]).map((b) => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`ind.basis.${b}`)}
        </button>
      ))}
    </div>
  );
}
