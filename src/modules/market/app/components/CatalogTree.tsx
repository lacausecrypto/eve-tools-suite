import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { CATALOG, type CatalogCategory } from "../lib/catalog";
import { resolveTypeNames } from "../api";

/** Filtre le catalogue par sous-chaîne (insensible à la casse). */
function filterCatalog(query: string): CatalogCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG;
  return CATALOG.map((cat) => ({
    name: cat.name,
    groups: cat.groups
      .map((g) => ({
        name: g.name,
        items: g.items.filter((it) => it.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0),
  })).filter((cat) => cat.groups.length > 0);
}

export function CatalogTree({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: number, name: string) => void;
}) {
  const t = useT();
  /** Traduit un libellé de catalogue curé ; repli sur le nom EVE brut (noms propres). */
  const label = (name: string) => {
    const k = "market.cat." + name;
    const tr = t(k);
    return tr === k ? name : tr;
  };
  const filtered = useMemo(() => filterCatalog(query), [query]);
  // Quand on recherche, on déplie tout pour voir les correspondances.
  const searching = query.trim().length > 0;
  const [open, setOpen] = useState<Set<string>>(new Set([CATALOG[0]?.name]));
  const [loading, setLoading] = useState<string | null>(null);

  async function pick(name: string) {
    setLoading(name);
    try {
      const res = await resolveTypeNames([name]);
      const hit = res.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? res[0];
      if (hit) onSelect(hit.id, hit.name);
    } finally {
      setLoading(null);
    }
  }

  if (!filtered.length) {
    return (
      <p className="px-1 py-3 text-xs text-muted-foreground">
        {t("market.catalog.noMatch")}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((cat) => {
        const isOpen = searching || open.has(cat.name);
        return (
          <div key={cat.name}>
            <button
              onClick={() =>
                setOpen((s) => {
                  const n = new Set(s);
                  n.has(cat.name) ? n.delete(cat.name) : n.add(cat.name);
                  return n;
                })
              }
              className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-sm font-medium hover:bg-muted/50"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              {label(cat.name)}
            </button>
            {isOpen && (
              <div className="ml-3 border-l border-border/60 pl-2">
                {cat.groups.map((g) => (
                  <div key={g.name} className="py-0.5">
                    <div className="px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {label(g.name)}
                    </div>
                    {g.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => pick(item)}
                        className={cn(
                          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-foreground/80 hover:bg-muted/60",
                        )}
                      >
                        {loading === item && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
