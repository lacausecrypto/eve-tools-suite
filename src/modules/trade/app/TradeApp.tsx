import { useState } from "react";
import { ArrowRightLeft, ChevronDown, Coins, Radar, ShoppingCart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTrade } from "./store";
import { StationScanner } from "./components/StationScanner";
import { ArbitrageScanner } from "./components/ArbitrageScanner";
import { RoutePlanner } from "./components/RoutePlanner";
import { MultibuyBasket } from "./components/MultibuyBasket";
import { FeeSettings } from "./components/FeeSettings";
import type { HaulItem } from "./lib/haul";

type Tab = "station" | "arbitrage" | "routes" | "multibuy";

/**
 * Trade Co-Pilot — trouve où gagner de l'ISK : scanner de station-trading,
 * scanner d'arbitrage inter-hubs et panier multibuy transverse, partageant un
 * moteur de profit net (frais courtier + taxe). 100 % ESI publique.
 */
export function TradeApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("arbitrage");
  const [feesOpen, setFeesOpen] = useState(false);
  const fees = useTrade((s) => s.fees);
  const mbText = useTrade((s) => s.mbText);
  const setMb = useTrade((s) => s.setMb);
  const addHaul = useTrade((s) => s.addHaul);

  /** Ajoute des objets scannés au panier multibuy puis bascule sur l'onglet. */
  const addToMultibuy = (lines: { name: string; qty: number }[]) => {
    if (!lines.length) return;
    const text = lines.map((l) => `${l.name}\t${Math.max(1, Math.round(l.qty))}`).join("\n");
    setMb({ mbText: mbText.trim() ? `${mbText.trimEnd()}\n${text}` : text });
    setTab("multibuy");
  };

  /** Envoie des objets au planificateur d'itinéraire puis bascule sur l'onglet. */
  const planRoute = (items: HaulItem[]) => {
    if (!items.length) return;
    addHaul(items);
    setTab("routes");
  };

  return (
    <div data-tour="trade.root" className="mx-auto w-full max-w-7xl px-5 py-5 animate-fade-in">
      {/* Barre d'onglets + frais */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-card/40 p-1">
          <TabBtn active={tab === "station"} onClick={() => setTab("station")} icon={<Radar className="h-4 w-4" />}>
            {t("trade.tab.station")}
          </TabBtn>
          <TabBtn
            active={tab === "arbitrage"}
            onClick={() => setTab("arbitrage")}
            icon={<ArrowRightLeft className="h-4 w-4" />}
          >
            {t("trade.tab.arbitrage")}
          </TabBtn>
          <TabBtn
            active={tab === "routes"}
            onClick={() => setTab("routes")}
            icon={<Truck className="h-4 w-4" />}
          >
            {t("trade.tab.routes")}
          </TabBtn>
          <TabBtn
            active={tab === "multibuy"}
            onClick={() => setTab("multibuy")}
            icon={<ShoppingCart className="h-4 w-4" />}
          >
            {t("trade.tab.multibuy")}
          </TabBtn>
        </div>

        <Popover open={feesOpen} onOpenChange={setFeesOpen}>
          <PopoverTrigger asChild>
            <button className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm hover:bg-muted/40">
              <Coins className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">{t("trade.fees.label")}</span>
              <span className="font-medium">{fees.brokerFeePct}%</span>
              <span className="text-muted-foreground">{t("trade.fees.broker")}</span>
              <span className="font-medium">{fees.salesTaxPct}%</span>
              <span className="text-muted-foreground">{t("trade.fees.tax")}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", feesOpen && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="p-0">
            <FeeSettings />
          </PopoverContent>
        </Popover>
      </div>

      {tab === "station" ? (
        <StationScanner onAddToMultibuy={addToMultibuy} />
      ) : tab === "arbitrage" ? (
        <ArbitrageScanner onAddToMultibuy={addToMultibuy} onPlanRoute={planRoute} />
      ) : tab === "routes" ? (
        <RoutePlanner />
      ) : (
        <MultibuyBasket />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
