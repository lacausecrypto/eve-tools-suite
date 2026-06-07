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

type Key = "name" | "qty";
const fmtQty = (n: number) => n.toLocaleString("fr-FR");

export function StockHistoryDialog({
  session,
  trigger,
}: {
  session: Session;
  trigger: React.ReactNode;
}) {
  const t = useT();
  const update = useStore((s) => s.updateStockItem);
  const remove = useStore((s) => s.removeStockItem);
  const [sort, setSort] = useState<{ k: Key; d: 1 | -1 }>({ k: "qty", d: -1 });

  const items = session.stock ?? [];
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const c =
        sort.k === "qty"
          ? a.qty - b.qty
          : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      return c * sort.d;
    });
    return arr;
  }, [items, sort]);
  const totalQty = items.reduce((a, i) => a + i.qty, 0);

  const toggle = (k: Key) =>
    setSort((s) => (s.k === k ? { k, d: (s.d * -1) as 1 | -1 } : { k, d: 1 }));

  const Th = ({ k, label, right }: { k: Key; label: string; right?: boolean }) => (
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-fleur" />
            {t("mining.stockHist.title")}
            <span className="text-xs text-muted-foreground font-normal tabular-nums">
              {t("mining.stockHist.summary", { n: items.length, qty: fmtQty(totalQty) })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("mining.stockHist.empty")}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60 sticky top-0 bg-card">
                  <Th k="name" label={t("mining.stockHist.col.consumable")} />
                  <Th k="qty" label={t("mining.stockHist.col.qty")} right />
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((it) => (
                  <tr
                    key={it.name}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-1 pr-2">{it.name}</td>
                    <td className="py-1 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        defaultValue={it.qty}
                        onBlur={(ev) => {
                          const v = Number(ev.target.value);
                          if (v >= 0 && v !== it.qty)
                            update(session.id, it.name, v);
                        }}
                        className="w-24 bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-1 py-0.5 text-right font-mono tabular-nums focus:outline-none"
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button
                        onClick={() => remove(session.id, it.name)}
                        title={t("mining.stockHist.deleteRow")}
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
          {t("mining.stockHist.footnote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
