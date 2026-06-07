/** Graphique en anneau (SVG, sans dépendance), palette rouge + bleu acier. */

export const CHART_COLORS = [
  "hsl(0 78% 53%)", // rouge
  "hsl(211 78% 56%)", // bleu acier
  "hsl(0 68% 64%)", // rouge clair
  "hsl(211 60% 44%)", // bleu sombre
  "hsl(0 58% 42%)", // rouge sombre
  "hsl(206 85% 73%)", // bleu clair
  "hsl(348 52% 48%)", // cramoisi
  "hsl(218 40% 56%)", // bleu gris
];

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export function colorFor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

export function DonutChart({
  data,
  size = 148,
  thickness = 20,
  centerValue,
  centerLabel,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={thickness}
      />
      <g transform={`rotate(-90 ${c} ${c})`}>
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * circ;
            const node = (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={d.color ?? colorFor(i)}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return node;
          })}
      </g>
      {(centerValue || centerLabel) && (
        <>
          <text
            x={c}
            y={c - 1}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 17, fontWeight: 700 }}
          >
            {centerValue}
          </text>
          <text
            x={c}
            y={c + 15}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: 0.5 }}
          >
            {centerLabel}
          </text>
        </>
      )}
    </svg>
  );
}

/** Légende compacte associée à un donut. */
export function DonutLegend({
  data,
  format,
}: {
  data: DonutDatum[];
  format: (v: number) => string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ul className="space-y-1 min-w-0 flex-1">
      {data.map((d, i) => (
        <li key={d.label} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ background: d.color ?? colorFor(i) }}
          />
          <span className="truncate flex-1">{d.label}</span>
          <span className="tabular-nums text-muted-foreground shrink-0">
            {format(d.value)}
          </span>
          <span className="tabular-nums text-muted-foreground/70 shrink-0 w-9 text-right">
            {((d.value / total) * 100).toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
