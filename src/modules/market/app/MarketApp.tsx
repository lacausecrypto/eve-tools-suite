import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./components/Sidebar";
import { MarketView } from "./components/MarketView";

/**
 * Market Browser — explorateur du marché EVE (carnet d'ordres multi-hubs,
 * moyennes 5 %, marge, volumes, historique). 100 % ESI publique : fonctionne en
 * web comme en desktop, sans login ni `CLIENT_ID`. EULA-safe.
 */
export function MarketApp() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] animate-fade-in">
        <Sidebar />
        <MarketView />
      </div>
    </TooltipProvider>
  );
}
