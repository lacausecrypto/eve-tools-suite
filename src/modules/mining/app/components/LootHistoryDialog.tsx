import { useMemo, useState } from "react";
import { History, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mining/components/ui/dialog";

type Key = "time" | "miner" | "qty" | "ore";
const fmtQty = (n: number) => n.toLocaleString("fr-FR");

export function LootHistoryDialog({
  session,
  trigger,
}: {
  session: Session;
  trigger: React.ReactNode;
}) {
  const t = useT();
  const update = useStore((s) => s.updateLootEvent);
  const remove = useStore((s) => s.removeLootEvent);
  const [sort, setSort] = useState<{ k: Key; d: 1 | -1 }>({ k: "time", d: 1 });

  const events = session.lootEvents ?? [];
  const sorted = useMemo(() => {
    const arr = [...events];
    arr.sort((a, b) => {
      const c =
        sort.k === "qty"
          ? a.qty - b.qty
          : String(a[sort.k]).toLowerCase().localeCompare(
              String(b[sort.k]).toLowerCase()
            );
      return c * sort.d;
    });
    return arr;
  }, [events, sort]);
  const totalQty = events.reduce((a, e) => a + e.qty, 0);

  const toggle = (k: Key) =>
    setSort((s) => (s.k === k ? { k, d: (s.d * -1) as 1 | -1 } : { k, d: 1 }));

  const Th = ({
    k,
    label,
    right,
  }: {
    k: Key;
    label: string;
    right?: boolean;
  }) => (
    <th className={`py-1.5 font-medium ${right ? "text-right px-2" : "pr-2"}`}>
      <button
        onClick={() => toggle(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          sort.k === k ? "text-foreground" : ""
        }`}
      >
        {label}
        {sort.k === k &&
          (sort.d === 1 ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t("mining.lootHist.title")}
            <span className="text-xs text-muted-foreground font-normal tabular-nums">
              {t("mining.lootHist.summary", { n: events.length, qty: fmtQty(totalQty) })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("mining.lootHist.empty")}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60 sticky top-0 bg-card">
                  <Th k="time" label={t("mining.lootHist.col.time")} />
                  <Th k="miner" label={t("mining.lootHist.col.miner")} />
                  <Th k="qty" label={t("mining.lootHist.col.qty")} right />
                  <Th k="ore" label={t("mining.lootHist.col.ore")} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr
                    key={e.sig}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-1 pr-2 tabular-nums text-muted-foreground">
                      {e.time}
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        defaultValue={e.miner}
                        onBlur={(ev) => {
                          const v = ev.target.value.trim();
                          if (v && v !== e.miner)
                            update(session.id, e.sig, { miner: v });
                        }}
                        className="w-full min-w-[110px] bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-1 py-0.5 focus:outline-none"
                      />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        defaultValue={e.qty}
                        onBlur={(ev) => {
                          const v = Number(ev.target.value);
                          if (v >= 0 && v !== e.qty)
                            update(session.id, e.sig, { qty: v });
                        }}
                        className="w-24 bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-1 py-0.5 text-right font-mono tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2 truncate max-w-[170px]" title={e.raw || e.ore}>
                      {e.raw || e.ore}
                    </td>
                    <td className="py-1 text-right">
                      <button
                        onClick={() => remove(session.id, e.sig)}
                        title={t("mining.lootHist.deleteRow")}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {t("mining.lootHist.footnote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
