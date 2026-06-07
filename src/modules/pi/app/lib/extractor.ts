/**
 * Modèle de **decay des extracteurs** — implémentation fidèle de l'algorithme
 * **officiel CCP** (developers.eveonline.com/docs/guides/pi).
 *
 * C'est la feature signature : le rendement d'un extracteur n'est pas constant,
 * il décroît sur la durée du programme (avec une oscillation). On reproduit la
 * courbe cycle par cycle, ce qui permet une simulation temporelle réaliste.
 *
 * Référence (pseudo-code CCP) :
 *   decay_factor = 0.012 ; noise_factor = 0.8
 *   bar_width    = cycle_time / 900
 *   t            = (cycle + 0.5) * bar_width
 *   decay_value  = qty_per_cycle / (1 + t * decay_factor)
 *   phase_shift  = qty_per_cycle ^ 0.7
 *   sin_stuff    = max((cos(phase_shift + t/12) + cos(phase_shift/2 + t·0.2) + cos(t·0.5)) / 3, 0)
 *   bar_height   = decay_value * (1 + noise_factor * sin_stuff)
 *   yield_cycle  = round(bar_width * bar_height)
 */

export const DECAY_FACTOR = 0.012;
export const NOISE_FACTOR = 0.8;

/** Durées de cycle d'extraction proposées in-game (secondes). */
export const CYCLE_TIMES = [
  { sec: 900, label: "15 min" },
  { sec: 1800, label: "30 min" },
  { sec: 3600, label: "1 h" },
  { sec: 7200, label: "2 h" },
  { sec: 14400, label: "4 h" },
  { sec: 21600, label: "6 h" },
  { sec: 43200, label: "12 h" },
  { sec: 86400, label: "24 h" },
] as const;

/** Une tête d'extracteur (ECU en compte jusqu'à 10). */
export const MAX_HEADS = 10;

/**
 * Rendement par cycle d'**une tête** d'extracteur, sur `totalCycles` cycles.
 * `qtyPerCycle` est la valeur de base affichée par l'ECU in-game (dépend de la
 * richesse du gisement et de la durée du programme).
 */
export function extractorYields(
  qtyPerCycle: number,
  cycleSec: number,
  totalCycles: number,
): number[] {
  const barWidth = cycleSec / 900.0;
  const phaseShift = Math.pow(qtyPerCycle, 0.7);
  const out: number[] = [];
  for (let cycle = 0; cycle < totalCycles; cycle++) {
    const t = (cycle + 0.5) * barWidth;
    const decayValue = qtyPerCycle / (1 + t * DECAY_FACTOR);
    const sinA = Math.cos(phaseShift + t * (1 / 12));
    const sinB = Math.cos(phaseShift / 2 + t * 0.2);
    const sinC = Math.cos(t * 0.5);
    const sinStuff = Math.max((sinA + sinB + sinC) / 3, 0);
    const barHeight = decayValue * (1 + NOISE_FACTOR * sinStuff);
    out.push(Math.max(0, Math.round(barWidth * barHeight)));
  }
  return out;
}

export interface ProgramSummary {
  /** Rendement par cycle (toutes têtes confondues). */
  perCycle: number[];
  /** Total extrait sur tout le programme (toutes têtes). */
  total: number;
  /** Durée totale du programme (heures). */
  durationHours: number;
  /** Débit moyen sur le programme (unités/heure). */
  unitsPerHour: number;
  /** Pic de production (unités sur un cycle, toutes têtes). */
  peak: number;
  /** Débit du premier cycle vs dernier (mesure du decay, %). */
  decayPct: number;
}

/**
 * Résume un programme d'extraction : `heads` têtes identiques de `qtyPerCycle`,
 * `cycleSec` par cycle, `totalCycles` cycles.
 */
export function summarizeProgram(
  qtyPerCycle: number,
  cycleSec: number,
  totalCycles: number,
  heads: number,
): ProgramSummary {
  const one = extractorYields(qtyPerCycle, cycleSec, totalCycles);
  const perCycle = one.map((v) => v * heads);
  const total = perCycle.reduce((a, b) => a + b, 0);
  const durationHours = (cycleSec * totalCycles) / 3600;
  const unitsPerHour = durationHours > 0 ? total / durationHours : 0;
  const peak = perCycle.length ? Math.max(...perCycle) : 0;
  const first = perCycle[0] ?? 0;
  const last = perCycle[perCycle.length - 1] ?? 0;
  const decayPct = first > 0 ? ((first - last) / first) * 100 : 0;
  return { perCycle, total, durationHours, unitsPerHour, peak, decayPct };
}

/** Nombre de cycles pour couvrir une durée de programme (heures). */
export function cyclesForDuration(cycleSec: number, hours: number): number {
  return Math.max(1, Math.floor((hours * 3600) / cycleSec));
}
