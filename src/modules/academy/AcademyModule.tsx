import "./app/messages";
import { AcademyApp } from "./app/AcademyApp";

/** Point de montage du module EVE Academy dans le shell de la suite. */
export function AcademyModule() {
  return <AcademyApp />;
}
