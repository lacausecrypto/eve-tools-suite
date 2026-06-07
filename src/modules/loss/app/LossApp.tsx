import { useState } from "react";
import { AlertCircle, Loader2, Search, Skull } from "lucide-react";
import { useT } from "@/core/i18n";
import { isTauri } from "@/core/runtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLossInput } from "./store";
import {
  analyzeKillmail,
  analyzeLatest,
  resolveCharacter,
  type PostMortem,
} from "./api";
import { parseInput } from "./lib/parseInput";
import { PostMortemView } from "./components/PostMortemView";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; pm: PostMortem };

/**
 * Loss Post-Mortem Analyzer — colle un lien killmail/zKill ou un pseudo de
 * pilote ; on retrouve la dernière perte et on en fait un post-mortem digeste.
 * Réutilise le moteur `pbh-core` (ESI + zKillboard) du module Pirate.
 */
export function LossApp() {
  const t = useT();
  const input = useLossInput((s) => s.input);
  const setInput = useLossInput((s) => s.setInput);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function run() {
    const parsed = parseInput(input);
    if (!parsed) return;
    setStatus({ kind: "loading" });
    try {
      let pm: PostMortem | null = null;
      if (parsed.kind === "esi") {
        pm = await analyzeKillmail(parsed.id, parsed.hash);
      } else if (parsed.kind === "id") {
        pm = await analyzeKillmail(parsed.id);
      } else {
        const id = await resolveCharacter(parsed.name);
        if (id == null) {
          setStatus({ kind: "error", message: t("loss.error.nameNotFound") });
          return;
        }
        pm = await analyzeLatest(id);
        if (pm == null) {
          setStatus({ kind: "error", message: t("loss.error.noLosses") });
          return;
        }
      }
      setStatus({ kind: "done", pm });
    } catch (e) {
      const message = isTauri()
        ? e instanceof Error
          ? e.message
          : String(e)
        : t("loss.desktop.note");
      setStatus({ kind: "error", message });
    }
  }

  return (
    <div data-tour="loss.root" className="mx-auto w-full max-w-5xl px-5 py-5 animate-fade-in">
      {/* Barre de saisie */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder={t("loss.input.placeholder")}
          className="flex-1"
          spellCheck={false}
        />
        <Button onClick={run} disabled={!input.trim() || status.kind === "loading"}>
          {status.kind === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {t("loss.input.analyze")}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("loss.input.hint")}</p>

      {/* Corps */}
      <div className="mt-5">
        {status.kind === "idle" && <Intro />}
        {status.kind === "loading" && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loss.status.loading")}
          </div>
        )}
        {status.kind === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">{t("loss.error.title")}</div>
              <div className="text-muted-foreground">{status.message}</div>
            </div>
          </div>
        )}
        {status.kind === "done" && <PostMortemView pm={status.pm} />}
      </div>
    </div>
  );
}

function Intro() {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <Skull className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{t("loss.empty.title")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("loss.empty.body")}</p>
      <div className="mx-auto mt-4 max-w-md space-y-1 text-left text-xs text-muted-foreground">
        <Example value="https://zkillboard.com/kill/123456789/" label={t("loss.example.zkill")} />
        <Example value="Pilot Name" label={t("loss.example.name")} />
        <Example value="123456789" label={t("loss.example.id")} />
      </div>
    </div>
  );
}

function Example({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5">
      <code className="truncate font-mono text-foreground/80">{value}</code>
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
    </div>
  );
}
