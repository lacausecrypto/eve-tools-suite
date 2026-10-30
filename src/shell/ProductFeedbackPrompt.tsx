import { useEffect, useState } from "react";
import { Check, MessageCircle, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { APP } from "@/core/app";
import { analyticsTool, track, type AnalyticsTool } from "@/core/analytics";
import { openExternal } from "@/core/external";
import { useSettings } from "@/core/settings";
import { Button } from "@/components/ui/button";
import { useTour } from "@/core/tour/store";

const SHOWN_KEY = "ets:feedback:last-shown";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function feedbackDue(lastShown: string | null, now = Date.now()): boolean {
  const previous = Number(lastShown);
  return !Number.isFinite(previous) || previous <= 0 || now - previous >= COOLDOWN_MS;
}

export function ProductFeedbackPrompt() {
  const language = useSettings((s) => s.language);
  const activeTour = useTour((s) => s.tour);
  const [tool, setTool] = useState<AnalyticsTool | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      if (tool) return;
      try {
        if (!feedbackDue(localStorage.getItem(SHOWN_KEY))) return;
        const nextTool = analyticsTool((event as CustomEvent<{ tool?: string }>).detail?.tool ?? "");
        localStorage.setItem(SHOWN_KEY, String(Date.now()));
        window.setTimeout(() => setTool(nextTool), 900);
      } catch { /* Le feedback ne doit jamais gêner l'action produit. */ }
    };
    window.addEventListener("ets:successful-action", onSuccess);
    return () => window.removeEventListener("ets:successful-action", onSuccess);
  }, [tool]);

  if (!tool || activeTour) return null;
  const fr = language === "fr";
  const respond = (helpful: boolean) => {
    setAnswer(helpful);
    track("feedback_submitted", { helpful, tool });
  };

  return (
    <aside className="fixed bottom-4 left-1/2 z-[85] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-popover p-4 shadow-2xl">
      <button onClick={() => setTool(null)} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-secondary" aria-label={fr ? "Fermer" : "Close"}>
        <X className="h-4 w-4" />
      </button>
      {answer == null ? (
        <>
          <p className="pr-6 text-sm font-semibold">{fr ? "Ce résultat vous a-t-il aidé ?" : "Did this result help you?"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{fr ? "Une réponse suffit — aucun contenu EVE n'est envoyé." : "One tap is enough — no EVE content is sent."}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => respond(true)}><ThumbsUp className="h-4 w-4" />{fr ? "Oui" : "Yes"}</Button>
            <Button size="sm" variant="outline" onClick={() => respond(false)}><ThumbsDown className="h-4 w-4" />{fr ? "Non" : "No"}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold"><Check className="h-4 w-4 text-success" />{fr ? "Merci pour votre retour." : "Thanks for your feedback."}</p>
          <button onClick={() => void openExternal(`${APP.repository}/issues/new`)} className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline">
            <MessageCircle className="h-4 w-4" />{fr ? "Ajouter un détail facultatif sur GitHub" : "Optionally add details on GitHub"}
          </button>
        </>
      )}
    </aside>
  );
}
