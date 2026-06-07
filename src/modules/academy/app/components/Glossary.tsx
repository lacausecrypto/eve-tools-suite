import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/core/i18n";
import { GLOSSARY } from "../data/glossary";

export function Glossary() {
  const t = useT();
  const [q, setQ] = useState("");

  // Termes résolus dans la langue courante (terme / sigle / définition).
  const resolved = useMemo(
    () =>
      GLOSSARY.map((entry) => ({
        id: entry.term,
        tags: entry.tags,
        term: t(`academy.glo.${entry.term}.term`),
        short: entry.short ? t(`academy.glo.${entry.term}.short`) : "",
        def: t(`academy.glo.${entry.term}.def`),
      })),
    [t],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = !s
      ? resolved
      : resolved.filter(
          (term) =>
            term.term.toLowerCase().includes(s) ||
            term.short.toLowerCase().includes(s) ||
            term.def.toLowerCase().includes(s),
        );
    return [...list].sort((a, b) => a.term.localeCompare(b.term));
  }, [q, resolved]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("academy.glossary.search")}
          className="pl-8 pr-8"
          spellCheck={false}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {t("academy.glossary.termsCount", { n: filtered.length })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((term) => (
          <div key={term.id} className="rounded-xl border border-border bg-card/40 p-3">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{term.term}</span>
              {term.short && <span className="text-xs text-muted-foreground">({term.short})</span>}
            </div>
            <p className="mt-0.5 text-sm text-foreground/80">{term.def}</p>
            {term.tags && term.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {term.tags.map((tag) => (
                  <Badge key={tag} variant="muted" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            {t("academy.glossary.noMatch")}
          </p>
        )}
      </div>
    </div>
  );
}
