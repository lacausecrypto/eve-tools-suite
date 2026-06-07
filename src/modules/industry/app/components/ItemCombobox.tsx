import { useMemo, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const MAX_SUGGESTIONS = 10;

/**
 * Combobox d'objet EVE : sélecteur **avec recherche**. Le chevron ouvre une liste
 * de suggestions (filtrées par la saisie, ou un aperçu si vide) ; on peut aussi
 * **taper librement** tout nom exact (résolu via ESI au calcul). Clavier ↑/↓/⏎/Échap.
 */
export function ItemCombobox({
  value,
  onChange,
  options,
  placeholder,
  className,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  /** Appelé sur Entrée quand aucune suggestion n'est sélectionnée. */
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, MAX_SUGGESTIONS); // aperçu si vide (via chevron)
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of options) {
      const lo = o.toLowerCase();
      if (lo === q) continue;
      if (lo.startsWith(q)) starts.push(o);
      else if (lo.includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [value, options]);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) {
      if (e.key === "Enter") onEnter?.();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(matches.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(matches[active] ?? value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        className="pr-8"
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => !v);
          inputRef.current?.focus();
        }}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Suggestions"
      >
        <ChevronsUpDown className="h-4 w-4" />
      </button>
      {open && matches.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg scrollbar-thin"
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(m)}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  i === active
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent/50",
                )}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
