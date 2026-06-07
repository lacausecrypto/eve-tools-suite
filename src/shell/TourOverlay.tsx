import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTour } from "@/core/tour/store";
import { waitForAnchor, observeRect } from "@/core/tour/dom";
import { useSettings } from "@/core/settings";
import { useT } from "@/core/i18n";
import { Button } from "@/components/ui/button";

const PAD = 8; // marge autour de l'élément surligné
const GAP = 14; // espace entre l'élément et la bulle
const MARGIN = 16; // marge mini avec le bord de la fenêtre
const TT_W = 344; // largeur de la bulle

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Overlay du tour produit : assombrit l'écran, découpe un « spotlight » sur
 * l'élément ciblé (`data-tour`) et affiche une bulle d'explication bilingue
 * avec navigation. Bloque les interactions (guidé) ; respecte `reduceMotion`.
 */
export function TourOverlay() {
  const tour = useTour((s) => s.tour);
  const index = useTour((s) => s.index);
  const next = useTour((s) => s.next);
  const prev = useTour((s) => s.prev);
  const skip = useTour((s) => s.skip);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const t = useT();

  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  const [ready, setReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Résout l'ancre de l'étape courante (après une éventuelle action `before`),
  // puis suit sa position (scroll/resize).
  useEffect(() => {
    if (!tour) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const step = tour.steps[index];
    setReady(false);

    (async () => {
      try {
        await step.before?.();
      } catch {
        /* l'action d'ouverture ne doit jamais casser le tour */
      }
      if (cancelled) return;

      if (step.anchor) {
        const el = await waitForAnchor(step.anchor);
        if (cancelled) return;
        if (el) {
          el.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: reduceMotion ? "auto" : "smooth",
          });
          const measure = () => {
            const r = el.getBoundingClientRect();
            // Borne le spotlight à la fenêtre : un élément plus grand que l'écran
            // (ex. une grille de cartes) ne doit pas produire un halo géant/hors-champ.
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const x = Math.max(4, r.left - PAD);
            const y = Math.max(4, r.top - PAD);
            const right = Math.min(vw - 4, r.right + PAD);
            const bottom = Math.min(vh - 4, r.bottom + PAD);
            setRect({ x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) });
          };
          measure();
          cleanup = observeRect(el, measure);
          setReady(true);
          return;
        }
      }
      // Pas d'ancre (ou introuvable) → carte centrée.
      setRect(null);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [tour, index, reduceMotion]);

  // Positionne la bulle : sous l'élément si la place le permet, sinon au-dessus,
  // recentrée et bornée à la fenêtre. Centrée si pas d'ancre.
  useLayoutEffect(() => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const w = tt.offsetWidth || TT_W;
    const h = tt.offsetHeight || 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      setPos({ left: (vw - w) / 2, top: (vh - h) / 2 });
      return;
    }
    const belowRoom = vh - (rect.y + rect.h) - GAP - MARGIN >= h;
    const aboveRoom = rect.y - GAP - MARGIN >= h;
    let top = belowRoom || !aboveRoom ? rect.y + rect.h + GAP : rect.y - GAP - h;
    let left = rect.x + rect.w / 2 - w / 2;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    setPos({ left, top });
  }, [rect, index, tour, ready]);

  // Clavier : Échap = passer, ←/→ = naviguer.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, next, prev, skip]);

  if (!tour) return null;
  const step = tour.steps[index];
  const last = index === tour.steps.length - 1;
  const motion = reduceMotion ? "none" : "opacity .15s ease, left .2s ease, top .2s ease";

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Capte/bloque les clics (mode guidé). */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Voile sombre avec découpe sur la cible. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="12" fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(3 7 18 / 0.76)" mask="url(#tour-mask)" />
      </svg>

      {/* Halo autour de la cible. */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            boxShadow:
              "0 0 0 2px hsl(var(--primary)), 0 0 0 5px hsl(var(--primary) / 0.25), 0 0 28px hsl(var(--primary) / 0.45)",
            transition: motion,
          }}
        />
      )}

      {/* Bulle d'explication. */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(step.titleKey)}
        className="pointer-events-auto absolute rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl"
        style={{ left: pos.left, top: pos.top, width: TT_W, opacity: ready ? 1 : 0, transition: motion }}
      >
        <button
          onClick={skip}
          aria-label={t("tour.ui.skip")}
          className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1.5 pr-6 text-sm font-semibold text-foreground" aria-live="polite">
          {t(step.titleKey)}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground" aria-live="polite">
          {t(step.bodyKey)}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("tour.ui.progress", { i: index + 1, n: tour.steps.length })}
          </span>
          <div className="flex items-center gap-1.5">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("tour.ui.prev")}
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {last ? t("tour.ui.finish") : t("tour.ui.next")}
              {!last && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
