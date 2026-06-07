import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GripVertical, Settings2, X } from "lucide-react";
import {
  COLS,
  resolveCollisions,
  useDashboard,
  widgetByGid,
  type WidgetInstance,
} from "@/core/dashboard";
import { getModule } from "@/core/module/registry";
import { useWorkspace } from "@/core/workspace";
import { useT, useLocalized } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { WidgetBoxProvider } from "@/components/ui/widget";
import { WidgetConfigDialog } from "./WidgetConfigDialog";

const ROW_H = 56;
const GAP = 10;
const MIN_W = 2;
const MIN_H = 2;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  orig: { x: number; y: number; w: number; h: number };
  cur: { x: number; y: number; w: number; h: number };
}

/** Canvas de widgets : placement libre sur une grille magnétique 12 colonnes. */
export function DashboardGrid() {
  const instances = useDashboard((s) => s.instances);
  const editing = useDashboard((s) => s.editing);
  const setLayouts = useDashboard((s) => s.setLayouts);
  const instancesRef = useRef(instances);
  instancesRef.current = instances;

  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cellW = width > 0 ? (width - (COLS - 1) * GAP) / COLS : 0;
  const unitX = cellW + GAP;
  const unitY = ROW_H + GAP;

  // Suivi du drag/resize via listeners globaux.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const dCols = Math.round((e.clientX - drag.startX) / unitX);
      const dRows = Math.round((e.clientY - drag.startY) / unitY);
      setDrag((d) => {
        if (!d) return d;
        if (d.mode === "move") {
          const x = clamp(d.orig.x + dCols, 0, COLS - d.orig.w);
          const y = Math.max(0, d.orig.y + dRows);
          return { ...d, cur: { ...d.cur, x, y } };
        }
        const w = clamp(d.orig.w + dCols, MIN_W, COLS - d.orig.x);
        const h = Math.max(MIN_H, d.orig.h + dRows);
        return { ...d, cur: { ...d.cur, w, h } };
      });
    };
    const onUp = () => {
      setDrag((d) => {
        if (d) {
          const base = instancesRef.current.map((i) => ({
            id: i.id,
            x: i.x,
            y: i.y,
            w: i.w,
            h: i.h,
          }));
          const working = base.map((b) =>
            b.id === d.id ? { ...b, ...d.cur } : b,
          );
          setLayouts(resolveCollisions(working, d.id));
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, unitX, unitY, setLayouts]);

  // Disposition affichée : résolution **live** des collisions pendant le drag
  // (le widget manipulé reste fixe, les autres sont poussés vers le bas).
  const display = useMemo(() => {
    const base = instances.map((i) => ({
      id: i.id,
      x: i.x,
      y: i.y,
      w: i.w,
      h: i.h,
    }));
    if (!drag) return new Map(base.map((b) => [b.id, b]));
    const working = base.map((b) => (b.id === drag.id ? { ...b, ...drag.cur } : b));
    return new Map(resolveCollisions(working, drag.id).map((r) => [r.id, r]));
  }, [instances, drag]);

  const layoutOf = (inst: WidgetInstance) => display.get(inst.id) ?? inst;

  let rows = editing ? 3 : 0;
  display.forEach((l) => {
    rows = Math.max(rows, l.y + l.h + (editing ? 3 : 0));
  });

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{
        height: Math.max(1, rows) * unitY,
        backgroundImage: editing
          ? "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)"
          : undefined,
        backgroundSize: editing ? `${unitX}px ${unitY}px` : undefined,
        backgroundPosition: editing ? `${cellW / 2}px ${ROW_H / 2}px` : undefined,
      }}
    >
      {/* Aperçu de la cible (snap) pendant le drag */}
      {drag && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-dashed border-fleur/50 bg-fleur/5"
          style={px(drag.cur, unitX, unitY, cellW)}
        />
      )}

      {instances.map((inst) => {
        const l = layoutOf(inst);
        const isDragging = drag?.id === inst.id;
        return (
          <div
            key={inst.id}
            className={cn(
              "absolute transition-[left,top,width,height]",
              isDragging ? "z-30 duration-0" : "duration-150",
            )}
            style={px(l, unitX, unitY, cellW)}
          >
            <WidgetTile
              inst={inst}
              layout={l}
              editing={editing}
              dragging={isDragging}
              onConfig={() => setConfigId(inst.id)}
              onDragStart={(e, mode) =>
                setDrag({
                  id: inst.id,
                  mode,
                  startX: e.clientX,
                  startY: e.clientY,
                  orig: { x: inst.x, y: inst.y, w: inst.w, h: inst.h },
                  cur: { x: inst.x, y: inst.y, w: inst.w, h: inst.h },
                })
              }
            />
          </div>
        );
      })}

      <WidgetConfigDialog
        instanceId={configId}
        onClose={() => setConfigId(null)}
      />
    </div>
  );
}

function px(
  l: { x: number; y: number; w: number; h: number },
  unitX: number,
  unitY: number,
  cellW: number,
) {
  return {
    left: l.x * unitX,
    top: l.y * unitY,
    width: l.w * cellW + (l.w - 1) * GAP,
    height: l.h * ROW_H + (l.h - 1) * GAP,
  };
}

function WidgetTile({
  inst,
  layout,
  editing,
  dragging,
  onConfig,
  onDragStart,
}: {
  inst: WidgetInstance;
  layout: { x: number; y: number; w: number; h: number };
  editing: boolean;
  dragging: boolean;
  onConfig: () => void;
  onDragStart: (e: React.PointerEvent, mode: "move" | "resize") => void;
}) {
  const t = useT();
  const loc = useLocalized();
  const removeInstance = useDashboard((s) => s.removeInstance);
  const openModule = useWorkspace((s) => s.openModule);
  const entry = widgetByGid(inst.gid);

  // Mesure la zone de contenu → les primitives réorganisent les données.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBox({ width: el.clientWidth, height: el.clientHeight }),
    );
    ro.observe(el);
    setBox({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  if (!entry)
    return (
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-border bg-card/60 text-xs text-muted-foreground">
        ?
      </div>
    );

  const { owner, widget } = entry;
  const Icon = widget.icon;
  const W = widget.component;
  const openable = !!getModule(owner.id);
  // Tous les widgets sont configurables : titre personnalisable au minimum.
  const customTitle = ((inst.config.title as string) ?? "").trim();
  const title = customTitle || loc(widget.title);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        dragging && "shadow-xl ring-2 ring-fleur/40",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1.5",
          editing && "cursor-grab active:cursor-grabbing select-none",
        )}
        onPointerDown={editing ? (e) => onDragStart(e, "move") : undefined}
      >
        <button
          onClick={() => !editing && openable && openModule(owner.id)}
          disabled={editing || !openable}
          title={openable ? t("board.openTool", { name: loc(owner.name) }) : undefined}
          className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors enabled:hover:text-foreground"
        >
          {editing && <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          {Icon && (
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: owner.accent }} />
          )}
          <span className="truncate">{title}</span>
        </button>
        {editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <TileBtn label={t("board.configure")} onClick={onConfig}>
              <Settings2 className="h-3.5 w-3.5" />
            </TileBtn>
            <TileBtn
              label={t("board.remove")}
              danger
              onClick={() => removeInstance(inst.id)}
            >
              <X className="h-3.5 w-3.5" />
            </TileBtn>
          </div>
        )}
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden p-3">
        <WidgetBoxProvider
          value={{ cols: layout.w, rows: layout.h, width: box.width, height: box.height }}
        >
          <WidgetBoundary>
            <W config={inst.config} />
          </WidgetBoundary>
        </WidgetBoxProvider>
      </div>

      {editing && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            onDragStart(e, "resize");
          }}
          title={t("board.resize")}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, hsl(var(--fleur)) 50%)",
            opacity: 0.6,
            borderBottomRightRadius: "0.6rem",
          }}
        />
      )}
    </div>
  );
}

function TileBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-6 place-items-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        danger
          ? "text-muted-foreground hover:bg-muted hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

class WidgetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="grid h-full place-items-center text-xs text-muted-foreground">
          ⚠
        </div>
      );
    return this.props.children;
  }
}
