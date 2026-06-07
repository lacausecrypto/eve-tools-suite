import { useRef, useState } from "react";
import {
  ClipboardCopy,
  Download,
  Factory,
  Loader2,
  ShoppingCart,
  Trash2,
  Upload,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/core/toast";
import { isTauri } from "@/core/runtime";
import { useAccounts } from "@/core/account";
import { resolveNames } from "@/core/universe";
import { typeIconUrl } from "@/core/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDuration, fmtInt, fmtIsk } from "../lib/format";
import { ACTIVITY_NAME, fetchIndustryJobs, type IndustryJob } from "../api";
import {
  ledgerTotals,
  shoppingList,
  useLedger,
  type JobStatus,
  type LedgerEntry,
} from "../store";
import { Kpi } from "./bits";

const FILE_KIND = "eve-industry/ledger";

export function Ledger() {
  const t = useT();
  const entries = useLedger((s) => s.entries);
  const { remove, setStatus, markSold, importEntries, clear } = useLedger();
  const totals = ledgerTotals(entries);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const text = JSON.stringify(
      { app: "EVE Industry Tracker", kind: FILE_KIND, version: 1, entries },
      null,
      2,
    );
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eve-industry-ledger.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(file: File) {
    try {
      const obj = JSON.parse(await file.text()) as { entries?: LedgerEntry[] };
      const arr = Array.isArray(obj) ? obj : (obj.entries ?? []);
      const valid = (arr as LedgerEntry[]).filter(
        (e) => typeof e.outputName === "string" && typeof e.totalCost === "number",
      );
      const n = importEntries(valid);
      toast.success(t("ind.ledger.imported", { n }));
    } catch {
      toast.error(t("ind.ledger.importError"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label={t("ind.ledger.inProduction")} value={fmtIsk(totals.inProductionCost)} tone="accent" />
        <Kpi
          label={t("ind.ledger.expected")}
          value={fmtIsk(totals.expectedProfit)}
          tone={totals.expectedProfit >= 0 ? "good" : "bad"}
        />
        <Kpi
          label={t("ind.ledger.realized")}
          value={fmtIsk(totals.realizedProfit)}
          tone={totals.realizedProfit >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {t("ind.ledger.count", { open: totals.openCount, done: totals.doneCount })}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button variant="outline" size="sm" onClick={exportJson} disabled={!entries.length}>
            <Download className="h-4 w-4" />
            {t("ind.ledger.export")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {t("ind.ledger.import")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="h-4 w-4" />
              {t("ind.ledger.clear")}
            </Button>
          )}
        </div>
      </div>

      <ShoppingPanel entries={entries} />
      <EsiJobsPanel />

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {t("ind.ledger.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              onRemove={() => remove(e.id)}
              onStatus={(s) => setStatus(e.id, s)}
              onSold={(price) => markSold(e.id, price)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EsiJobsPanel() {
  const t = useT();
  const activeId = useAccounts((s) => s.activeId);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<{ job: IndustryJob; product: string }[]>([]);

  async function load() {
    if (activeId == null) {
      setError(t("ind.assets.needChar"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const raw = await fetchIndustryJobs(activeId);
      const active = raw.filter((j) => j.status === "active");
      const ids = active.map((j) => j.product_type_id ?? j.blueprint_type_id);
      const names = await resolveNames(ids);
      setJobs(
        active.map((job) => ({
          job,
          product: names.get(job.product_type_id ?? job.blueprint_type_id)?.name ?? "—",
        })),
      );
      setStatus("done");
    } catch (e) {
      setError(isTauri() ? (e instanceof Error ? e.message : String(e)) : t("ind.jobs.desktop"));
      setStatus("error");
    }
  }

  function endsIn(iso: string): number {
    const end = Date.parse(iso);
    return Number.isFinite(end) ? Math.max(0, (end - Date.now()) / 1000) : 0;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Factory className="h-4 w-4" />
        <span className="text-sm font-semibold">{t("ind.jobs.title")}</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={load} disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t("ind.jobs.load")}
        </Button>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {status === "done" && (
        jobs.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">{t("ind.jobs.none")}</p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            {jobs.map(({ job, product }) => (
              <div key={job.job_id} className="flex items-center gap-2">
                <Badge variant="muted">{ACTIVITY_NAME[job.activity_id] ?? "?"}</Badge>
                <span className="min-w-0 flex-1 truncate">{product}</span>
                <span className="shrink-0 text-xs text-muted-foreground">×{fmtInt(job.runs)}</span>
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                  {fmtDuration(endsIn(job.end_date))}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ShoppingPanel({ entries }: { entries: LedgerEntry[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const list = shoppingList(entries);
  if (list.lines.length === 0) return null;

  function copy() {
    navigator.clipboard?.writeText(list.multibuy).then(
      () => toast.success(t("ind.shop.copied")),
      () => toast.error(t("ind.shop.copyFail")),
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 p-3 text-sm font-semibold"
      >
        <ShoppingCart className="h-4 w-4" />
        {t("ind.shop.title")}
        <Badge variant="muted">{t("ind.shop.count", { n: list.lines.length, jobs: list.jobCount })}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          <div className="max-h-64 space-y-1 overflow-auto text-sm scrollbar-thin">
            {list.lines.map((l) => (
              <div key={l.typeId + l.name} className="flex items-center gap-2">
                {l.typeId > 0 && <img src={typeIconUrl(l.typeId, 32)} alt="" className="h-5 w-5 rounded" />}
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{fmtInt(Math.ceil(l.qty))}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={copy} className="w-full">
            <ClipboardCopy className="h-4 w-4" />
            {t("ind.shop.copy")}
          </Button>
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  onRemove,
  onStatus,
  onSold,
}: {
  entry: LedgerEntry;
  onRemove: () => void;
  onStatus: (s: JobStatus) => void;
  onSold: (price: number) => void;
}) {
  const t = useT();
  const [sell, setSell] = useState(String(entry.expectedUnitSell || ""));
  const done = entry.status === "done";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        {entry.outputTypeId > 0 && (
          <img src={typeIconUrl(entry.outputTypeId, 32)} alt="" className="h-8 w-8 shrink-0 rounded" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{entry.outputName}</span>
            <Badge variant={done ? "success" : "muted"}>
              {t(`ind.status.${entry.status}`)}
            </Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t("ind.ledger.row", {
              runs: entry.runs,
              units: fmtInt(entry.unitsProduced),
              unit: fmtIsk(entry.unitCost),
            })}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">{t("ind.ledger.totalCost")}</div>
          <div className="font-semibold tabular-nums">{fmtIsk(entry.totalCost)}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
        {/* Statuts */}
        {(["planned", "active"] as JobStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs transition-colors",
              entry.status === s
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`ind.status.${s}`)}
          </button>
        ))}

        {/* Profit attendu / réalisé */}
        {done ? (
          <span className="text-sm">
            {t("ind.ledger.realizedAt", { price: fmtIsk(entry.soldUnitPrice ?? 0) })}{" "}
            <span
              className={cn(
                "font-semibold",
                (entry.realizedProfit ?? 0) >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {fmtIsk(entry.realizedProfit ?? 0)}
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("ind.ledger.expectedShort")}{" "}
            <span className={cn((entry.expectedProfit ?? 0) >= 0 ? "text-success" : "text-destructive")}>
              {fmtIsk(entry.expectedProfit)}
            </span>
          </span>
        )}

        {/* Marquer vendu */}
        <div className="ml-auto flex items-center gap-1.5">
          {!done && (
            <>
              <Input
                type="number"
                value={sell}
                onChange={(e) => setSell(e.target.value)}
                placeholder={t("ind.ledger.soldPrice")}
                className="h-8 w-28 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const p = parseFloat(sell);
                  if (Number.isFinite(p) && p > 0) onSold(p);
                }}
              >
                {t("ind.ledger.markSold")}
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
