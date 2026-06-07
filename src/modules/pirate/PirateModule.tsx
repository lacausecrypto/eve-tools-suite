import "./app/messages";
import { PirateApp } from "./app/PirateApp";

/** Point de montage du module Pirate dans le shell de la suite. */
export function PirateModule() {
  return <PirateApp />;
}
