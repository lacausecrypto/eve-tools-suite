import { useT } from "@/core/i18n";
import { typeIconUrl } from "@/core/images";
import { Badge } from "@/components/ui/badge";
import type { FitModule, PmFit } from "../api";

const COLUMNS: { key: keyof PmFit; label: string }[] = [
  { key: "high", label: "loss.slot.high" },
  { key: "mid", label: "loss.slot.mid" },
  { key: "low", label: "loss.slot.low" },
  { key: "rig", label: "loss.slot.rig" },
  { key: "drone", label: "loss.slot.drone" },
];

/** Fit reconstruit depuis le killmail, en colonnes par emplacement. */
export function FitColumns({ fit }: { fit: PmFit }) {
  const t = useT();
  const empty = COLUMNS.every((c) => fit[c.key].length === 0);

  if (empty) {
    return (
      <p className="text-sm text-muted-foreground italic">{t("loss.fit.empty")}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {COLUMNS.map((c) => (
        <div key={c.key} className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(c.label)}
          </div>
          {fit[c.key].length === 0 ? (
            <div className="text-xs text-muted-foreground/60">—</div>
          ) : (
            fit[c.key].map((m, i) => <ModuleRow key={`${m.type_id}-${i}`} m={m} />)
          )}
        </div>
      ))}
    </div>
  );
}

function ModuleRow({ m }: { m: FitModule }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-1.5 py-1">
      <img
        src={typeIconUrl(m.type_id, 32)}
        alt=""
        loading="lazy"
        className="h-6 w-6 shrink-0 rounded"
      />
      <span className="flex-1 truncate text-xs" title={m.name ?? String(m.type_id)}>
        {m.name ?? `#${m.type_id}`}
      </span>
      {m.quantity > 1 && (
        <Badge variant="muted" className="shrink-0 px-1 py-0 text-[10px]">
          ×{m.quantity}
        </Badge>
      )}
    </div>
  );
}
