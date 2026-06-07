import { Info, Lightbulb } from "lucide-react";
import { typeIconUrl, typeRenderUrl } from "@/core/images";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import type { Block } from "./types";

const imgUrl = (typeId: number, variant: "render" | "icon", size: number) =>
  variant === "render" ? typeRenderUrl(typeId, size) : typeIconUrl(typeId, size);

/** Bloc + base de clé i18n (ex. « academy.lesson.capsule.b3 »). */
export interface KeyedBlock {
  block: Block;
  /** Préfixe de clé de traduction pour ce bloc (textes/items/lignes/légendes). */
  tk: string;
}

/** Rendu d'un contenu de leçon (liste de blocs) — typographie homogène. */
export function LessonContent({ blocks }: { blocks: KeyedBlock[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b.block} tk={b.tk} />
      ))}
    </div>
  );
}

function BlockView({ block, tk }: { block: Block; tk: string }) {
  const t = useT();
  switch (block.t) {
    case "p":
      return <p className="text-foreground/85">{t(tk)}</p>;
    case "h":
      return <h4 className="pt-1 text-sm font-semibold text-foreground">{t(tk)}</h4>;
    case "ul":
      return (
        <ul className="list-disc space-y-1 pl-5 text-foreground/85 marker:text-muted-foreground">
          {block.items.map((_, i) => (
            <li key={i}>{t(`${tk}.i${i}`)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1 pl-5 text-foreground/85 marker:text-muted-foreground">
          {block.items.map((_, i) => (
            <li key={i}>{t(`${tk}.i${i}`)}</li>
          ))}
        </ol>
      );
    case "tip":
      return (
        <div className="flex gap-2 rounded-lg border border-success/30 bg-success/10 p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-foreground/85">{t(tk)}</p>
        </div>
      );
    case "warn":
      return (
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-foreground/85">{t(tk)}</p>
        </div>
      );
    case "kv":
      return (
        <div className="overflow-hidden rounded-lg border border-border">
          {block.title && (
            <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {t(`${tk}.title`)}
            </div>
          )}
          <div className="divide-y divide-border/60">
            {block.rows.map((_, i) => (
              <div key={i} className="grid grid-cols-[10rem_1fr] gap-3 px-3 py-2">
                <span className="text-xs font-medium text-foreground">{t(`${tk}.k${i}`)}</span>
                <span className="text-foreground/80">{t(`${tk}.v${i}`)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "img":
      return (
        <figure className="overflow-hidden rounded-xl border border-border bg-background/40">
          <div className="grid place-items-center bg-[radial-gradient(circle_at_center,hsl(var(--muted)/0.4),transparent)] p-4">
            <img
              src={imgUrl(block.typeId, block.variant, block.variant === "render" ? 512 : 128)}
              alt={block.caption ? t(`${tk}.caption`) : ""}
              loading="lazy"
              className={block.variant === "render" ? "max-h-72 w-auto" : "h-24 w-24"}
            />
          </div>
          {block.caption && (
            <figcaption className="border-t border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">
              {t(`${tk}.caption`)}
            </figcaption>
          )}
        </figure>
      );
    case "gallery":
      return (
        <figure className="rounded-xl border border-border bg-background/40 p-3">
          <div className="flex flex-wrap items-start justify-center gap-4">
            {block.items.map((it, i) => (
              <div key={i} className="flex w-24 flex-col items-center gap-1.5 text-center">
                <img
                  src={imgUrl(it.typeId, it.variant ?? "icon", it.variant === "render" ? 256 : 64)}
                  alt={t(`${tk}.l${i}`)}
                  loading="lazy"
                  className={cn(
                    "rounded-lg border border-border/60 bg-background/60",
                    it.variant === "render" ? "h-20 w-20 object-contain" : "h-16 w-16",
                  )}
                />
                <span className="text-[11px] leading-tight text-foreground/80">{t(`${tk}.l${i}`)}</span>
              </div>
            ))}
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {t(`${tk}.caption`)}
            </figcaption>
          )}
        </figure>
      );
  }
}
