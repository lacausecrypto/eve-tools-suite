import type { FleetEvent, LootEvent, SessionMember } from "@mining/types";

/**
 * Convertit un "HH:MM:SS" du broadcast en timestamp réel.
 *
 * Les heures des Diffusions EVE sont en **temps EVE = UTC** (identiques pour
 * tous les joueurs, FR comme CA). On les interprète en UTC et on les ramène à
 * l'occurrence de cette heure la plus proche de la référence (±12 h) — ce qui
 * gère le passage de minuit UTC dans **les deux sens** (un log de 23:55 collé
 * juste après une session démarrée à 00:05 est bien la veille, pas le futur).
 */
export function broadcastTimeToTs(reference: number, hms: string): number {
  const [h, m, sec] = hms.split(":").map((n) => parseInt(n, 10));
  const d = new Date(reference);
  d.setUTCHours(h || 0, m || 0, sec || 0, 0);
  let ts = d.getTime();
  const DAY = 24 * 3600 * 1000;
  const HALF = 12 * 3600 * 1000;
  while (ts - reference > HALF) ts -= DAY;
  while (reference - ts > HALF) ts += DAY;
  return ts;
}

type Boundary = { ts: number; kind: "open" | "close" };

/**
 * (Re)calcule la présence des membres à partir des Diffusions : récoltes (présence)
 * et entrées/sorties de flotte (reprise / pause).
 *
 * Déterministe et idempotent : pour chaque membre présent dans les Diffusions, on
 * reconstruit ses intervalles à partir des événements horodatés (heure du LOG, pas
 * du collage). Une « sortie de flotte » ferme l'intervalle à son heure ; une
 * « entrée » (ou une récolte) après une sortie en rouvre un. Recoller plus tard ne
 * change rien (mêmes événements → mêmes intervalles). Un membre absent des
 * Diffusions garde sa présence (gérée manuellement) inchangée. On ne crée jamais
 * de membre ici : les entrées/sorties n'affectent que les membres déjà au roster.
 */
export function computeBroadcastPresence(
  members: SessionMember[],
  lootEvents: LootEvent[],
  fleetEvents: FleetEvent[],
  startedAt: number,
  active: boolean
): SessionMember[] {
  if (lootEvents.length === 0 && fleetEvents.length === 0) return members;

  const byMember = new Map<string, Boundary[]>();
  const add = (name: string, b: Boundary) => {
    const k = name.toLowerCase();
    const arr = byMember.get(k);
    if (arr) arr.push(b);
    else byMember.set(k, [b]);
  };
  for (const e of lootEvents)
    add(e.miner, { ts: broadcastTimeToTs(startedAt, e.time), kind: "open" });
  for (const f of fleetEvents)
    add(f.member, {
      ts: broadcastTimeToTs(startedAt, f.time),
      kind: f.type === "join" ? "open" : "close",
    });

  return members.map((m) => {
    const bounds = byMember.get(m.name.toLowerCase());
    if (!bounds || !bounds.some((b) => b.kind === "open")) return m; // hors Diffusions (ou que des sorties) → inchangé

    // Tri chronologique ; à heure égale, ouverture avant fermeture.
    const sorted = [...bounds].sort(
      (a, b) =>
        a.ts - b.ts || (a.kind === b.kind ? 0 : a.kind === "open" ? -1 : 1)
    );

    const intervals: { joinedAt: number; leftAt: number | null }[] = [];
    let openAt: number | null = null;
    let lastTs = sorted[0].ts;
    for (const b of sorted) {
      lastTs = b.ts;
      if (b.kind === "open") {
        if (openAt === null) openAt = b.ts; // ouvre si fermé, sinon reste ouvert
      } else if (openAt !== null) {
        intervals.push({ joinedAt: openAt, leftAt: Math.max(openAt, b.ts) });
        openAt = null; // sortie de flotte → pause
      }
    }
    if (openAt !== null) {
      intervals.push({
        joinedAt: openAt,
        leftAt: active ? null : Math.max(openAt, lastTs),
      });
    }
    return { ...m, intervals };
  });
}
