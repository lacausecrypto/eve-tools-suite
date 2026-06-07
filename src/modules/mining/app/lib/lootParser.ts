import type { FleetEvent, LootEvent } from "@mining/types";

/**
 * Parse le copier-coller de l'onglet « Diffusions » d'une flotte EVE.
 *
 * Formats gérés (EN & FR) :
 *   09:48:40 Marie Alneb has looted 50,174 x Omber III-Grade
 *   09:40:36 georges alneb a récupéré 20.334 x Omber de catégorie III*
 *
 * Les lignes hors récolte (rejoint / quitté la flotte, « Aucune diffusion »…)
 * ne correspondent pas au motif et sont naturellement ignorées.
 */

// "has looted" (EN) | "a récupéré" / "a recupere" (FR)
const LOOT_RE =
  /^\s*(\d{1,2}:\d{2}:\d{2})\s+(.+?)\s+(?:has looted|a r[ée]cup[ée]r[ée])\s+([\d., \s]+?)\s*[x×]\s*(.+?)\s*$/i;

// Suffixes de grade : EN " II-Grade" / FR " de catégorie II" / " catégorie II"
const GRADE_EN_RE = /\s+(I{1,3}|IV)-Grade\s*$/i;
const GRADE_FR_RE = /\s+(?:de\s+)?cat[ée]gorie\s+(I{1,3}|IV)\s*$/i;

// Entrée/sortie de flotte (EN & FR). Le séparateur "-" est optionnel (et parfois collé).
// Ex : "23:00:50 - Ranneve3 left fleet" · "20:20:21 -Ranneve3 joined as Squad Member"
const LEAVE_RE =
  /^\s*(\d{1,2}:\d{2}:\d{2})\s*[-–]?\s*(.+?)\s+(?:left|a\s+quitt[ée]|quitte)\s+(?:the\s+|la\s+)?(?:fleet|flotte)\b/i;
const JOIN_RE =
  /^\s*(\d{1,2}:\d{2}:\d{2})\s*[-–]?\s*(.+?)\s+(?:joined|a\s+rejoint|rejoint)\b/i;

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
const ROMAN_OUT: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

/**
 * Nom canonique EVE d'un minerai (= nom exact résolvable par l'API ESI).
 * CCP nomme les variantes « <Minerai> II-Grade / III-Grade ». Ex :
 *   ("Omber", 0) -> "Omber"   ·   ("Omber", 3) -> "Omber III-Grade"
 */
export function canonicalOreName(base: string, grade: number): string {
  return grade > 0 && ROMAN_OUT[grade]
    ? `${base} ${ROMAN_OUT[grade]}-Grade`
    : base;
}

function parseQty(raw: string): number {
  // Retire tout sauf les chiffres (séparateurs de milliers ., , espace, nbsp).
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export interface NormalizedOre {
  base: string;
  grade: number; // 0 = base
}

/** Normalise un libellé de minerai : extrait le grade et le nom de base. */
export function normalizeOre(rawOre: string): NormalizedOre {
  let name = rawOre.replace(/\*+\s*$/, "").trim(); // retire les "*" finaux
  let grade = 0;

  const en = name.match(GRADE_EN_RE);
  const fr = name.match(GRADE_FR_RE);
  if (en) {
    grade = ROMAN[en[1].toUpperCase()] ?? 0;
    name = name.replace(GRADE_EN_RE, "").trim();
  } else if (fr) {
    grade = ROMAN[fr[1].toUpperCase()] ?? 0;
    name = name.replace(GRADE_FR_RE, "").trim();
  }
  return { base: name, grade };
}

export const GRADE_LABEL = (grade: number): string =>
  grade > 0 ? `${"I".repeat(grade > 3 ? 0 : grade) || "IV"}-Grade` : "";

export interface ParseResult {
  events: LootEvent[];
  fleetEvents: FleetEvent[];
  matchedLines: number;
  totalLines: number;
}

export function parseBroadcast(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const events: LootEvent[] = [];
  const fleetEvents: FleetEvent[] = [];
  const seen = new Set<string>();
  const seenFleet = new Set<string>();
  let totalLines = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    totalLines++;

    const m = line.match(LOOT_RE);
    if (m) {
      const [, time, minerRaw, qtyRaw, oreRaw] = m;
      const miner = minerRaw.trim();
      const qty = parseQty(qtyRaw);
      if (!miner || qty <= 0) continue;

      const { base, grade } = normalizeOre(oreRaw);
      const raw = oreRaw.replace(/\*+\s*$/, "").trim();
      const ore = canonicalOreName(base, grade);
      const sig = `${time}|${miner.toLowerCase()}|${qty}|${raw.toLowerCase()}`;
      if (seen.has(sig)) continue; // doublon dans le même collage
      seen.add(sig);
      events.push({ sig, time, miner, qty, ore, base, grade, raw });
      continue;
    }

    // Entrée / sortie de flotte (ne crée pas de mineur ; ajuste la présence).
    const leave = line.match(LEAVE_RE);
    const join = !leave ? line.match(JOIN_RE) : null;
    const fm = leave ?? join;
    if (fm) {
      const time = fm[1];
      const member = fm[2].trim().replace(/\s+/g, " ");
      if (!member) continue;
      const type: "join" | "leave" = leave ? "leave" : "join";
      const sig = `${time}|${member.toLowerCase()}|${type}`;
      if (seenFleet.has(sig)) continue;
      seenFleet.add(sig);
      fleetEvents.push({ sig, time, member, type });
    }
  }

  return {
    events,
    fleetEvents,
    matchedLines: events.length + fleetEvents.length,
    totalLines,
  };
}

/** Liste distincte des minerais de base présents dans des événements. */
export function distinctBases(events: LootEvent[]): string[] {
  return [...new Set(events.map((e) => e.base))].sort();
}

/** Liste distincte des minerais canoniques (grades séparés) pour la valorisation. */
export function distinctOres(events: LootEvent[]): string[] {
  return [
    ...new Set(
      events.map((e) => e.ore ?? canonicalOreName(e.base, e.grade))
    ),
  ].sort();
}

/** Liste distincte des mineurs. */
export function distinctMiners(events: LootEvent[]): string[] {
  return [...new Set(events.map((e) => e.miner))];
}
