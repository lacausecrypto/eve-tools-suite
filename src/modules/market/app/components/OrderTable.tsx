import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Check, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "@/core/toast";
import { useT } from "@/core/i18n";
import type { MarketOrder } from "../lib/types";
import { expiresIn, fmtAgo, fmtIskFull, fmtQty, fmtRange, fmtSec, secColor } from "../lib/format";

/** Copie un texte dans le presse-papiers (best-effort). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type SortKey = "price" | "volumeRemain" | "security" | "expires";

/** Nombre d'ordres affichés par défaut (les meilleurs) avant « voir tout ». */
const PREVIEW_ROWS = 5;

const expiresMs = (o: MarketOrder) =>
  Date.parse(o.issued) + o.duration * 86_400_000 - Date.now();

export function OrderTable({
  orders,
  side,
}: {
  orders: MarketOrder[];
  side: "sell" | "buy";
}) {
  const t = useT();
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [dir, setDir] = useState<"asc" | "desc">(side === "sell" ? "asc" : "desc");
  const [expanded, setExpanded] = useState(false);
  const maxVol = useMemo(
    () => orders.reduce((m, o) => Math.max(m, o.volumeRemain), 0) || 1,
    [orders],
  );

  const sorted = useMemo(() => {
    const get = (o: MarketOrder): number => {
      switch (sortKey) {
        case "price":
          return o.price;
        case "volumeRemain":
          return o.volumeRemain;
        case "security":
          return o.security ?? -1;
        case "expires":
          return expiresMs(o);
      }
    };
    return [...orders].sort((a, b) => (dir === "asc" ? get(a) - get(b) : get(b) - get(a)));
  }, [orders, sortKey, dir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir(k === "price" && side === "sell" ? "asc" : "desc");
    }
  };

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        {sortKey === k &&
          (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  if (!orders.length) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        {side === "sell" ? t("market.orders.emptySell") : t("market.orders.emptyBuy")}
      </p>
    );
  }

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_ROWS);
  const hidden = sorted.length - visible.length;

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="whitespace-nowrap px-2">{t("market.col.region")}</TableHead>
          <SortHead k="volumeRemain" className="whitespace-nowrap px-2 text-right">{t("market.col.quantity")}</SortHead>
          <SortHead k="price" className="whitespace-nowrap px-2 text-right">{t("market.col.price")}</SortHead>
          <SortHead k="security" className="px-2">{t("market.col.location")}</SortHead>
          {side === "buy" && <TableHead className="whitespace-nowrap px-2">{t("market.col.range")}</TableHead>}
          {side === "buy" && <TableHead className="whitespace-nowrap px-2 text-right">{t("market.col.minVol")}</TableHead>}
          <SortHead k="expires" className="whitespace-nowrap px-2">{t("market.col.expiresIn")}</SortHead>
          <TableHead className="whitespace-nowrap px-2">{t("market.col.modified")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((o) => (
          <TableRow key={o.orderId}>
            <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
              {o.regionName ?? "—"}
            </TableCell>
            <TableCell className="relative px-2 text-right tabular-nums">
              <span
                className={cn(
                  "absolute inset-y-1 right-0 rounded-l",
                  side === "sell" ? "bg-success/10" : "bg-primary/10",
                )}
                style={{ width: `${(o.volumeRemain / maxVol) * 100}%` }}
                aria-hidden
              />
              <span className="relative">{fmtQty(o.volumeRemain)}</span>
            </TableCell>
            <TableCell className="whitespace-nowrap px-2 text-right font-medium tabular-nums">
              {fmtIskFull(o.price)}
            </TableCell>
            <TableCell className="w-full max-w-[24rem] px-2">
              <LocationCell order={o} />
            </TableCell>
            {side === "buy" && (
              <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                {fmtRange(t, o.range)}
              </TableCell>
            )}
            {side === "buy" && (
              <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-muted-foreground">
                {fmtQty(o.minVolume)}
              </TableCell>
            )}
            <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
              {expiresIn(t, o.issued, o.duration)}
            </TableCell>
            <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
              {fmtAgo(t, o.issued)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {(hidden > 0 || expanded) && sorted.length > PREVIEW_ROWS && (
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> {t("market.orders.collapse", { n: PREVIEW_ROWS })}
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> {t("market.orders.showMore", { n: hidden })}
          </>
        )}
      </button>
    )}
    </>
  );
}

/**
 * Cellule de localisation : sécurité + nom, cliquable pour **copier** le nom
 * exact (station/structure) dans le presse-papiers — collable tel quel dans la
 * recherche/autopilote in-game. Bouton dédié visible au survol.
 */
function LocationCell({ order }: { order: MarketOrder }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const name = order.locationName ?? "—";

  async function copy() {
    if (!order.locationName) return;
    const ok = await copyText(order.locationName);
    if (ok) {
      setCopied(true);
      toast.success(t("market.orders.copied"), order.locationName);
      window.setTimeout(() => setCopied(false), 1200);
    } else {
      toast.error(t("market.orders.copyFailed"));
    }
  }

  return (
    <div className="group/loc flex min-w-0 items-center gap-1.5">
      <span className={cn("shrink-0 tabular-nums", secColor(order.security))}>
        {fmtSec(order.security)}
      </span>
      <button
        onClick={copy}
        title={t("market.orders.copyTitle", { name })}
        className="flex min-w-0 items-center gap-1.5 text-left hover:text-foreground"
      >
        <span className="truncate text-foreground/80">{name}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/loc:opacity-100" />
        )}
      </button>
    </div>
  );
}
