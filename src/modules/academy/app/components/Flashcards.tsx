import { useMemo, useState } from "react";
import { Check, Eye, Layers, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useAcademy, isDue } from "../store";
import { DECKS, ALL_CARDS } from "../data/flashcards";
import type { Flashcard } from "../lib/types";

export function Flashcards() {
  const t = useT();
  const srs = useAcademy((s) => s.srs);
  const [queue, setQueue] = useState<Flashcard[] | null>(null);

  const dueCount = useMemo(() => ALL_CARDS.filter((c) => isDue(srs, c.id)).length, [srs]);

  if (queue) {
    return <Session cards={queue} onExit={() => setQueue(null)} />;
  }

  const startDue = () => {
    const due = ALL_CARDS.filter((c) => isDue(srs, c.id));
    if (due.length) setQueue(shuffle(due));
  };

  return (
    <div className="space-y-4">
      <button
        onClick={startDue}
        disabled={dueCount === 0}
        className={cn(
          "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
          dueCount > 0
            ? "border-success/30 bg-success/5 hover:border-success/50"
            : "border-border bg-card/40 opacity-60",
        )}
      >
        <div className="grid size-11 place-items-center rounded-xl border border-success/40 bg-success/10">
          <Layers className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{t("academy.fc.reviewDue")}</h3>
          <p className="text-xs text-muted-foreground">
            {dueCount > 0
              ? t("academy.fc.dueToday", { n: dueCount })
              : t("academy.fc.allUpToDate")}
          </p>
        </div>
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        {DECKS.map((d) => {
          const due = d.cards.filter((c) => isDue(srs, c.id)).length;
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t(`academy.deck.${d.id}.title`)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t(`academy.deck.${d.id}.desc`)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("academy.fc.cardsCount", { n: d.cards.length })}
                  {due > 0 && <> · {t("academy.fc.dueInline", { n: due })}</>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setQueue(shuffle(d.cards))}>
                {t("academy.fc.review")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Session({ cards, onExit }: { cards: Flashcard[]; onExit: () => void }) {
  const t = useT();
  const reviewCard = useAcademy((s) => s.reviewCard);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState({ ok: 0, ko: 0 });

  const card = cards[i];
  const last = i === cards.length - 1;
  const done = i >= cards.length;

  function rate(ok: boolean) {
    reviewCard(card.id, ok);
    setStats((s) => ({ ok: s.ok + (ok ? 1 : 0), ko: s.ko + (ok ? 0 : 1) }));
    if (last) setI(cards.length);
    else {
      setI((n) => n + 1);
      setShow(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <Layers className="mx-auto h-10 w-10 text-success" />
        <h3 className="text-lg font-semibold">{t("academy.fc.sessionDone")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("academy.fc.sessionStats", { ok: stats.ok, ko: stats.ko })}
        </p>
        <Button size="sm" onClick={onExit}>
          {t("academy.fc.finish")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button onClick={onExit} className="hover:text-foreground">
          {t("academy.fc.quit")}
        </button>
        <span className="tabular-nums">{i + 1} / {cards.length}</span>
      </div>

      <button
        onClick={() => setShow(true)}
        className="grid min-h-48 w-full place-items-center rounded-2xl border border-border bg-card/40 p-6 text-center"
      >
        <div className="space-y-3">
          <div className="text-lg font-medium">{t(`academy.card.${card.id}.front`)}</div>
          {show ? (
            <div className="text-success">{t(`academy.card.${card.id}.back`)}</div>
          ) : (
            <Badge variant="muted" className="gap-1">
              <Eye className="h-3.5 w-3.5" /> {t("academy.fc.clickReveal")}
            </Badge>
          )}
        </div>
      </button>

      {show ? (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => rate(false)} className="border-destructive/40 text-destructive">
            <X className="h-4 w-4" /> {t("academy.fc.notKnown")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => rate(true)} className="border-success/40 text-success">
            <Check className="h-4 w-4" /> {t("academy.fc.known")}
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShow(true)}>
            <RotateCcw className="h-4 w-4" /> {t("academy.fc.reveal")}
          </Button>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
