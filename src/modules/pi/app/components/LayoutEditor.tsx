import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Cpu,
  Factory,
  Pickaxe,
  Rocket,
  Trash2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import {
  BUILDINGS,
  BUILDING_ORDER,
  CC_CAPACITY,
  RICHNESS,
  buildingCost,
  type BuildingType,
} from "../data/buildings";
import { PLANETS, type PlanetType } from "../data/commodities";
import { summarizeProgram } from "../lib/extractor";
import { fmtNum } from "../lib/format";
import { Field } from "./bits";

interface Placed {
  id: string;
  type: BuildingType;
  x: number; // 0..1
  y: number; // 0..1
  heads: number;
  richnessId: string;
}

const ICON: Record<BuildingType, typeof Factory> = {
  extractor: Pickaxe,
  basic: Factory,
  advanced: Factory,
  hightech: Cpu,
  storage: Box,
  launchpad: Rocket,
};
const COLOR: Record<BuildingType, string> = {
  extractor: "0 78% 53%",
  basic: "211 78% 56%",
  advanced: "270 70% 62%",
  hightech: "190 70% 50%",
  storage: "40 70% 55%",
  launchpad: "130 45% 50%",
};

const REF_CYCLE = 3600; // 1 h
const REF_CYCLES = 24; // programme 24 h pour l'estimation

/** Glisser en cours : ajout d'une nouvelle installation ou déplacement d'une existante. */
type DragState =
  | { kind: "new"; type: BuildingType }
  | { kind: "move"; id: string }
  | null;

export function LayoutEditor() {
  const t = useT();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  const [ccLevel, setCcLevel] = useState(3);
  const [planet, setPlanet] = useState<PlanetType>("temperate");
  const [buildings, setBuildings] = useState<Placed[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef({ x: 0, y: 0, moved: false });

  const selected = buildings.find((b) => b.id === selectedId) ?? null;
  const planetInfo = PLANETS.find((p) => p.id === planet)!;

  // --- Budget CPU / PG -------------------------------------------------------
  const used = useMemo(() => {
    return buildings.reduce(
      (acc, b) => {
        const c = buildingCost(b.type, b.type === "extractor" ? b.heads : 0);
        return { cpu: acc.cpu + c.cpu, pg: acc.pg + c.pg };
      },
      { cpu: 0, pg: 0 },
    );
  }, [buildings]);
  const cap = CC_CAPACITY[ccLevel];
  const overCpu = used.cpu > cap.cpu;
  const overPg = used.pg > cap.pg;

  // --- Extraction estimée ----------------------------------------------------
  const extractionPerHour = useMemo(() => {
    return buildings
      .filter((b) => b.type === "extractor")
      .reduce((sum, b) => {
        const r = RICHNESS.find((x) => x.id === b.richnessId) ?? RICHNESS[1];
        const prog = summarizeProgram(r.qtyPerCycle, REF_CYCLE, REF_CYCLES, b.heads);
        return sum + prog.unitsPerHour;
      }, 0);
  }, [buildings]);

  const counts = useMemo(() => {
    const m = new Map<BuildingType, number>();
    for (const b of buildings) m.set(b.type, (m.get(b.type) ?? 0) + 1);
    return m;
  }, [buildings]);

  // --- Glisser-déposer (pointer events, portable web + Tauri) ----------------
  // On évite le DnD HTML5 (`draggable`/`onDrop`) : le webview Tauri (WKWebView)
  // intercepte nativement le drag-drop et `onDrop` ne se déclenche jamais.
  function fractionFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
      return null;
    return {
      x: Math.min(0.95, Math.max(0.05, (clientX - rect.left) / rect.width)),
      y: Math.min(0.95, Math.max(0.05, (clientY - rect.top) / rect.height)),
    };
  }

  function startNew(type: BuildingType, e: React.PointerEvent) {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, moved: true };
    setGhost({ x: e.clientX, y: e.clientY });
    setDrag({ kind: "new", type });
  }

  function startMove(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY, moved: false };
    setGhost({ x: e.clientX, y: e.clientY });
    setSelectedId(id);
    setDrag({ kind: "move", id });
  }

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setGhost({ x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) > 4)
        dragStart.current.moved = true;
    };
    const onUp = (e: PointerEvent) => {
      const pos = fractionFromClient(e.clientX, e.clientY);
      if (drag.kind === "new") {
        if (pos) {
          const id = `b${idRef.current++}`;
          setBuildings((prev) => [
            ...prev,
            { id, type: drag.type, x: pos.x, y: pos.y, heads: 5, richnessId: "average" },
          ]);
          setSelectedId(id);
        }
      } else if (drag.kind === "move" && dragStart.current.moved && pos) {
        setBuildings((prev) =>
          prev.map((b) => (b.id === drag.id ? { ...b, x: pos.x, y: pos.y } : b)),
        );
      }
      setDrag(null);
      setGhost(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  const ghostType: BuildingType | null = drag
    ? drag.kind === "new"
      ? drag.type
      : (buildings.find((b) => b.id === drag.id)?.type ?? null)
    : null;

  function removeSelected() {
    if (!selectedId) return;
    setBuildings((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  }

  function updateSelected(patch: Partial<Placed>) {
    if (!selectedId) return;
    setBuildings((prev) =>
      prev.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ----- Panneau gauche ----- */}
      <div className="space-y-4">
        {/* Palette */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("pi.layout.palette")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0">
            {BUILDING_ORDER.map((type) => {
              const Icon = ICON[type];
              return (
                <div
                  key={type}
                  onPointerDown={(e) => startNew(type, e)}
                  className="flex touch-none select-none cursor-grab items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-xs hover:border-foreground/20 active:cursor-grabbing"
                  title={BUILDINGS[type].name}
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: `hsl(${COLOR[type]})` }}
                  />
                  <span className="truncate">{shortName(type)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Budget CPU / PG */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-fleur" /> CPU / Powergrid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Field label={t("pi.layout.ccLevel")}>
              <Select
                value={String(ccLevel)}
                onValueChange={(v) => setCcLevel(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CC_CAPACITY.map((_, lvl) => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      {`${t("pi.layout.ccLevel")} ${lvl}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Bar
              label="CPU"
              used={used.cpu}
              cap={cap.cpu}
              over={overCpu}
              unit="tf"
            />
            <Bar
              label="PG"
              used={used.pg}
              cap={cap.pg}
              over={overPg}
              unit="MW"
            />
            {(overCpu || overPg) && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <Zap className="h-3.5 w-3.5" /> {t("pi.layout.over")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Inspecteur / résumé */}
        {selected ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                {BUILDINGS[selected.type].name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={removeSelected}
                  title={t("pi.layout.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {selected.type === "extractor" ? (
                <>
                  <Field label={`${t("pi.layout.heads")} · ${selected.heads}`}>
                    <input
                      type="range"
                      className="eve-slider"
                      min={1}
                      max={10}
                      value={selected.heads}
                      onChange={(e) =>
                        updateSelected({ heads: parseInt(e.target.value, 10) })
                      }
                    />
                  </Field>
                  <Field
                    label={t("pi.layout.richness")}
                    hint={t("pi.layout.richnessNote")}
                  >
                    <Select
                      value={selected.richnessId}
                      onValueChange={(v) => updateSelected({ richnessId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RICHNESS.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {t(`pi.rich.${r.id}`)} · {fmtNum(r.qtyPerCycle)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {BUILDINGS[selected.type].cpu} tf ·{" "}
                  {BUILDINGS[selected.type].pg} MW
                  {BUILDINGS[selected.type].storage
                    ? ` · ${fmtNum(BUILDINGS[selected.type].storage!)} m³`
                    : ""}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-1.5 py-4 text-sm">
              <Stat
                label={t("pi.layout.extractionEst")}
                value={`${fmtNum(extractionPerHour)} ${t("pi.perHour")}`}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[...counts].map(([type, n]) => (
                  <Badge key={type} variant="muted">
                    {shortName(type)} ×{n}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ----- Surface planète ----- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select value={planet} onValueChange={(v) => setPlanet(v as PlanetType)}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {fmtNum(extractionPerHour)} {t("pi.perHour")} ·{" "}
            {buildings.length} {t("pi.layout.palette").toLowerCase()}
          </span>
        </div>

        <div
          ref={surfaceRef}
          onClick={(e) => {
            if (e.target === surfaceRef.current) setSelectedId(null);
          }}
          className={cn(
            "relative aspect-[4/3] w-full touch-none overflow-hidden rounded-xl border transition-colors",
            drag ? "border-fleur ring-2 ring-fleur/40" : "border-border",
          )}
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, hsl(${planetInfo.accent} / 0.35), hsl(${planetInfo.accent} / 0.08) 55%, hsl(var(--background)) 100%)`,
          }}
        >
          {buildings.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t("pi.layout.surfaceHint")}
            </div>
          )}
          {buildings.map((b) => {
            const Icon = ICON[b.type];
            const active = b.id === selectedId;
            return (
              <button
                key={b.id}
                onPointerDown={(e) => startMove(b.id, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(b.id);
                }}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 touch-none select-none cursor-grab items-center justify-center rounded-lg border shadow-md transition-transform active:cursor-grabbing",
                  active
                    ? "ring-2 ring-white"
                    : "hover:scale-110",
                  drag?.kind === "move" && drag.id === b.id && "opacity-40",
                )}
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  height: 40,
                  width: 40,
                  background: `hsl(${COLOR[b.type]} / 0.9)`,
                  borderColor: `hsl(${COLOR[b.type]})`,
                }}
                title={BUILDINGS[b.type].name}
              >
                <Icon className="h-5 w-5 text-white" />
                {b.type === "extractor" && (
                  <span className="absolute -bottom-1.5 -right-1.5 rounded bg-background px-1 text-[9px] font-semibold tabular-nums text-foreground">
                    {b.heads}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperçu fantôme qui suit le curseur pendant le glisser. */}
      {ghost && ghostType && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <div
            className="flex items-center justify-center rounded-lg border shadow-lg"
            style={{
              height: 40,
              width: 40,
              background: `hsl(${COLOR[ghostType]} / 0.9)`,
              borderColor: `hsl(${COLOR[ghostType]})`,
            }}
          >
            {(() => {
              const GhostIcon = ICON[ghostType];
              return <GhostIcon className="h-5 w-5 text-white" />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function shortName(type: BuildingType): string {
  switch (type) {
    case "extractor":
      return "Extractor";
    case "basic":
      return "Basic";
    case "advanced":
      return "Advanced";
    case "hightech":
      return "High-Tech";
    case "storage":
      return "Storage";
    case "launchpad":
      return "Launchpad";
  }
}

function Bar({
  label,
  used,
  cap,
  over,
  unit,
}: {
  label: string;
  used: number;
  cap: number;
  over: boolean;
  unit: string;
}) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn("tabular-nums", over ? "text-destructive" : "text-muted-foreground")}
        >
          {fmtNum(used)} / {fmtNum(cap)} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-fleur")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
