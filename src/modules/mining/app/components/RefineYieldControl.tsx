import { useMemo, useState } from "react";
import { SlidersHorizontal, Calculator, ChevronDown } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import {
  DEFAULT_REFINE_CONFIG,
  refineYieldPct,
  type RefineConfig,
} from "@mining/lib/refine";
import { Slider } from "@mining/components/ui/slider";
import { Button } from "@mining/components/ui/button";
import { cn } from "@mining/lib/utils";

const RED = "hsl(var(--primary))";

/** Segmented control compact. */
function Seg<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-muted/60 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.v)}
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors tabular-nums",
            value === o.v
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const LVL = [0, 1, 2, 3, 4, 5].map((v) => ({ v, label: String(v) }));

export function RefineYieldControl({ session }: { session: Session }) {
  const t = useT();
  const setRefinePct = useStore((s) => s.setRefinePct);
  const readOnly = session.status === "ended";
  const pct = session.refinePct ?? 100;

  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<RefineConfig>(DEFAULT_REFINE_CONFIG);
  const set = <K extends keyof RefineConfig>(k: K, v: RefineConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const computed = useMemo(() => refineYieldPct(cfg), [cfg]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
        <Slider
          value={pct}
          min={0}
          max={100}
          step={0.5}
          disabled={readOnly}
          color={RED}
          onValueChange={(v) => setRefinePct(session.id, v)}
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            key={pct}
            type="number"
            min={0}
            max={100}
            step={0.5}
            defaultValue={pct}
            disabled={readOnly}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setRefinePct(session.id, n);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-7 w-16 rounded-md border border-input bg-background px-2 text-right font-mono text-xs font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>

      {!readOnly && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calculator className="h-3 w-3" />
            {t("mining.refine.calculator")}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
            />
          </button>

          {open && (
            <div className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-2">
              <Row label={t("mining.refine.facility")}>
                <Seg
                  value={cfg.mode}
                  onChange={(v) => set("mode", v)}
                  options={[
                    { v: "station", label: t("mining.refine.npcStation") },
                    { v: "structure", label: t("mining.refine.structure") },
                  ]}
                />
              </Row>

              {cfg.mode === "station" ? (
                <Row label={t("mining.refine.stationBase")}>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={cfg.stationBase}
                    onChange={(e) =>
                      set("stationBase", Number(e.target.value) || 0)
                    }
                    className="h-6 w-16 rounded border border-input bg-background px-2 text-right font-mono text-[11px]"
                  />
                </Row>
              ) : (
                <>
                  <Row label={t("mining.refine.structureType")}>
                    <Seg
                      value={cfg.structureType}
                      onChange={(v) => set("structureType", v)}
                      options={[
                        { v: "citadel", label: t("mining.refine.citadel") },
                        { v: "athanor", label: t("mining.refine.athanor") },
                        { v: "tatara", label: t("mining.refine.tatara") },
                      ]}
                    />
                  </Row>
                  <Row label={t("mining.refine.rig")}>
                    <Seg
                      value={cfg.rig}
                      onChange={(v) => set("rig", v)}
                      options={[
                        { v: "none", label: t("mining.refine.none") },
                        { v: "t1", label: "T1" },
                        { v: "t2", label: "T2" },
                      ]}
                    />
                  </Row>
                  <Row label={t("mining.refine.security")}>
                    <Seg
                      value={cfg.security}
                      onChange={(v) => set("security", v)}
                      options={[
                        { v: "high", label: t("mining.refine.high") },
                        { v: "low", label: t("mining.refine.low") },
                        { v: "null", label: t("mining.refine.nullwh") },
                      ]}
                    />
                  </Row>
                </>
              )}

              <Row label={t("mining.refine.reprocessing")}>
                <Seg
                  value={cfg.reprocessing}
                  onChange={(v) => set("reprocessing", v)}
                  options={LVL}
                />
              </Row>
              <Row label={t("mining.refine.efficiency")}>
                <Seg
                  value={cfg.efficiency}
                  onChange={(v) => set("efficiency", v)}
                  options={LVL}
                />
              </Row>
              <Row label={t("mining.refine.oreProcessing")}>
                <Seg
                  value={cfg.oreProcessing}
                  onChange={(v) => set("oreProcessing", v)}
                  options={LVL}
                />
              </Row>
              <Row label={t("mining.refine.implant")}>
                <Seg
                  value={cfg.implant}
                  onChange={(v) => set("implant", v as 0 | 1 | 2 | 4)}
                  options={[
                    { v: 0, label: t("mining.refine.none") },
                    { v: 1, label: "+1" },
                    { v: 2, label: "+2" },
                    { v: 4, label: "+4" },
                  ]}
                />
              </Row>

              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-xs">
                  {t("mining.refine.computed")}
                  <span className="font-semibold text-primary tabular-nums">
                    {computed.toFixed(1)} %
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => setRefinePct(session.id, computed)}
                >
                  {t("mining.refine.apply")}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("mining.refine.note")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
