import "./app/messages";
import { MiningApp } from "@mining/MiningApp";

/** Point de montage du module Mining dans le shell de la suite. */
export function MiningModule() {
  return <MiningApp />;
}
