/** Hubs commerciaux (region + station — constantes SDE stables). Le `systemId`
 *  est résolu à l'exécution depuis la station (évite tout id codé en dur). */
import type { Hub } from "./types";

export const HUBS: Record<string, Hub> = {
  forge: { id: "forge", label: "Jita", region: 10000002, station: 60003760 },
  domain: { id: "domain", label: "Amarr", region: 10000043, station: 60008494 },
  sinq: { id: "sinq", label: "Dodixie", region: 10000032, station: 60011866 },
  heimatar: { id: "heimatar", label: "Rens", region: 10000030, station: 60004588 },
  metropolis: { id: "metropolis", label: "Hek", region: 10000042, station: 60005686 },
};

export const HUB_LIST: Hub[] = Object.values(HUBS);
export type HubId = keyof typeof HUBS;
