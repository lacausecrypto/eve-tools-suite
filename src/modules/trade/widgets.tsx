import { useT } from "@/core/i18n";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetStat, fmtIsk } from "@/components/ui/widget";
import { useTrade } from "./app/store";

export const tradeFeesConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "total",
    options: [
      { value: "total", label: { fr: "Frais totaux", en: "Total fees" } },
      { value: "broker", label: { fr: "Courtage seul", en: "Broker only" } },
      { value: "tax", label: { fr: "Taxe seule", en: "Sales tax only" } },
    ],
  },
  {
    key: "base",
    label: { fr: "Montant de vente (ISK, 0 = %)", en: "Sale amount (ISK, 0 = %)" },
    type: "number",
    default: 0,
  },
];

/** Widget : frais de vente — % ou ISK estimés sur un montant donné. */
export function TradeFeesWidget({ config }: WidgetProps) {
  const t = useT();
  const fees = useTrade((s) => s.fees);
  const broker = fees.brokerFeePct || 0;
  const tax = fees.salesTaxPct || 0;
  const metric = (config.metric as string) || "total";
  const pct = metric === "broker" ? broker : metric === "tax" ? tax : broker + tax;
  const base = Number(config.base) || 0;

  if (base > 0)
    return (
      <WidgetStat
        value={fmtIsk((base * pct) / 100)}
        sub={t("wg.trade.fees")}
        hint={`${pct.toFixed(2)} % · ${fmtIsk(base)}`}
      />
    );
  return <WidgetStat value={`${pct.toFixed(2)} %`} sub={t("wg.trade.fees")} />;
}
