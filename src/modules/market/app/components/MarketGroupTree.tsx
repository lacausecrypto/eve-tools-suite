import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { resolveNames } from "@/core/universe";
import { useT } from "@/core/i18n";
import {
  buildMarketTree,
  filterTree,
  type TreeNode,
} from "../lib/marketGroups";

/**
 * Arbre **complet** du marché (groupes ESI) — navigation lazy. Construit une fois
 * (cache persistant), puis se déplie comme la fenêtre Marché du jeu.
 */
export function MarketGroupTree({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: number, name: string) => void;
}) {
  const t = useT();
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setProgress({ done: 0, total: 0 });
    buildMarketTree((done, total) => {
      if (alive) setProgress({ done, total });
    })
      .then((roots) => {
        if (alive) {
          setTree(roots);
          setProgress(null);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setProgress(null);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <p className="px-1 py-2 text-xs text-destructive">{error}</p>;
  }
  if (!tree) {
    const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="space-y-2 px-1 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("market.tree.building")}
        </div>
        {progress && progress.total > 0 && (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="tabular-nums">{t("market.tree.progress", { done: progress.done, total: progress.total })}</div>
          </>
        )}
        <p className="text-[11px] text-muted-foreground/70">
          {t("market.tree.onceNote")}
        </p>
      </div>
    );
  }

  const roots = filterTree(tree, query);
  if (roots.length === 0) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">{t("market.tree.noGroup")}</p>;
  }
  return (
    <div className="space-y-0.5">
      {roots.map((n) => (
        <GroupNode key={n.id} node={n} depth={0} forceOpen={!!query.trim()} onSelect={onSelect} />
      ))}
    </div>
  );
}

function GroupNode({
  node,
  depth,
  forceOpen,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  forceOpen: boolean;
  onSelect: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(forceOpen || depth === 0);
  const isOpen = forceOpen || open;
  const hasChildren = node.children.length > 0;
  const hasTypes = node.types.length > 0;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm hover:bg-muted/60"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && (
        <div>
          {hasChildren &&
            node.children.map((c) => (
              <GroupNode key={c.id} node={c} depth={depth + 1} forceOpen={forceOpen} onSelect={onSelect} />
            ))}
          {hasTypes && <TypeLeaves typeIds={node.types} depth={depth + 1} onSelect={onSelect} />}
        </div>
      )}
    </div>
  );
}

function TypeLeaves({
  typeIds,
  depth,
  onSelect,
}: {
  typeIds: number[];
  depth: number;
  onSelect: (id: number, name: string) => void;
}) {
  const [items, setItems] = useState<{ id: number; name: string }[] | null>(null);

  useEffect(() => {
    let alive = true;
    resolveNames(typeIds)
      .then((map) => {
        if (!alive) return;
        const list = typeIds
          .map((id) => ({ id, name: map.get(id)?.name ?? `#${id}` }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setItems(list);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [typeIds]);

  if (!items) {
    return (
      <div className="px-1 py-1 text-xs text-muted-foreground" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        <Loader2 className="inline h-3 w-3 animate-spin" />
      </div>
    );
  }
  return (
    <>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id, it.name)}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-muted/60"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <img src={typeIconUrl(it.id, 32)} alt="" loading="lazy" className="h-4 w-4 shrink-0 rounded" />
          <span className="truncate">{it.name}</span>
        </button>
      ))}
    </>
  );
}
