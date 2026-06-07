import { Calculator, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/i18n";
import { useTrade } from "../store";
import { recomputeFees } from "../lib/fees";
import { NumField, SkillPicker } from "./bits";

/**
 * Réglages des frais — moteur de profit net. Compact (rendu dans un popover) :
 * % effectifs éditables, ou recalculés depuis les skills.
 */
export function FeeSettings() {
  const t = useT();
  const { fees, setFees } = useTrade();

  return (
    <div className="w-80 space-y-3 p-3.5">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-success" />
        <div>
          <h3 className="text-sm font-semibold leading-tight">{t("trade.fee.title")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("trade.fee.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <NumField
          label={t("trade.fee.brokerFee")}
          value={fees.brokerFeePct}
          onChange={(v) => setFees({ brokerFeePct: v ?? 0 })}
          suffix="%"
        />
        <NumField
          label={t("trade.fee.salesTax")}
          value={fees.salesTaxPct}
          onChange={(v) => setFees({ salesTaxPct: v ?? 0 })}
          suffix="%"
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("trade.fee.fromSkills")}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <SkillPicker
            label="Broker Relations"
            value={fees.brokerRelations}
            onChange={(v) => setFees({ brokerRelations: v })}
          />
          <SkillPicker
            label="Accounting"
            value={fees.accounting}
            onChange={(v) => setFees({ accounting: v })}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2.5 h-8 w-full"
          onClick={() => setFees(recomputeFees(fees))}
        >
          <Calculator className="h-4 w-4" />
          {t("trade.fee.apply", { broker: fees.brokerRelations, accounting: fees.accounting })}
        </Button>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground/80">
        {t("trade.fee.note")}
      </p>
    </div>
  );
}
