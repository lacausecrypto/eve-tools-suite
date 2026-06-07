import "./app/messages";
import { MarketApp } from "./app/MarketApp";

/** Point de montage du module Market Browser dans le shell de la suite. */
export function MarketModule() {
  return <MarketApp />;
}
