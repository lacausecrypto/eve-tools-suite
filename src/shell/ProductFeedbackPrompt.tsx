import { useEffect, useState } from "react";
import { Check, ClipboardCopy, ExternalLink, MessageCircle, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { APP } from "@/core/app";
import { analyticsConfigured, analyticsTool, track, type AnalyticsTool } from "@/core/analytics";
import { openExternal } from "@/core/external";
import { useSettings, useSettingsHydrated } from "@/core/settings";
import { Button } from "@/components/ui/button";
import { useTour } from "@/core/tour/store";

const SHOWN_KEY = "ets:feedback:last-shown";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const FEEDBACK_AUTO_CLOSE_MS = 8_000;
export const FEEDBACK_ERROR_CLOSE_MS = 20_000;

/** Public, static destinations only: never put user input or a response in a URL. */
export const FEEDBACK_LINKS = {
  issue: `${APP.repository}/issues/new`,
  star: APP.repository,
  discord: "https://discord.gg/jmPKrr28C5",
} as const;
type FeedbackLink = keyof typeof FEEDBACK_LINKS;

export function feedbackDue(lastShown: string | null, now = Date.now()): boolean {
  const previous = Number(lastShown);
  return !Number.isFinite(previous) || previous <= 0 || previous > now || now - previous >= COOLDOWN_MS;
}

export function feedbackDismissDelay(answer: boolean | null, failedToOpen = false): number | null {
  if (answer === null) return null;
  return failedToOpen ? FEEDBACK_ERROR_CLOSE_MS : FEEDBACK_AUTO_CLOSE_MS;
}

/** Report opener failures to the UI; no automatic external navigation or data transfer. */
export async function attemptFeedbackLink(
  destination: FeedbackLink,
  opener: (url: string) => Promise<void> = openExternal,
): Promise<boolean> {
  try {
    await opener(FEEDBACK_LINKS[destination]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Optional, opt-in-friendly prompt after a successful tool action.
 * The binary answer is the only payload tracked (subject to existing analytics consent).
 * No EVE text or account details are sent to external services.
 */
export function ProductFeedbackPrompt() {
  const language = useSettings((s) => s.language);
  const hydrated = useSettingsHydrated();
  const activeTour = useTour((s) => s.tour);
  const [tool, setTool] = useState<AnalyticsTool | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  const [failedLink, setFailedLink] = useState<FeedbackLink | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const dismiss = () => {
    setTool(null);
    setAnswer(null);
    setFailedLink(null);
    setCopyFailed(false);
  };

  useEffect(() => {
    let showTimer: number | undefined;
    const onSuccess = (event: Event) => {
      if (tool || !useSettings.persist.hasHydrated() || useTour.getState().tour) return;
      // Do not compete with the first-run consent dialog or onboarding invitation.
      const settings = useSettings.getState();
      if (analyticsConfigured() && (settings.analyticsConsent === "unset" || !settings.onboardingDone)) return;
      try {
        if (!feedbackDue(localStorage.getItem(SHOWN_KEY))) return;
        const nextTool = analyticsTool((event as CustomEvent<{ tool?: string }>).detail?.tool ?? "");
        localStorage.setItem(SHOWN_KEY, String(Date.now()));
        showTimer = window.setTimeout(() => {
          setAnswer(null);
          setFailedLink(null);
          setTool(nextTool);
        }, 900);
      } catch {
        // A feedback invitation must never interfere with normal product use.
      }
    };
    window.addEventListener("ets:successful-action", onSuccess);
    return () => {
      window.removeEventListener("ets:successful-action", onSuccess);
      if (showTimer !== undefined) window.clearTimeout(showTimer);
    };
  }, [tool]);

  // After any response, do not leave a persistent overlay until the user clicks X.
  // Allow more time to copy a URL when native external navigation failed.
  useEffect(() => {
    if (!tool) return;
    const delay = feedbackDismissDelay(answer, failedLink !== null);
    if (delay === null) return;
    const timer = window.setTimeout(() => dismiss(), delay);
    return () => window.clearTimeout(timer);
  }, [tool, answer, failedLink]);

  if (!hydrated || !tool || activeTour) return null;
  const fr = language === "fr";

  const respond = (helpful: boolean) => {
    setAnswer(helpful);
    track("feedback_submitted", { helpful, tool });
  };

  const visit = async (destination: FeedbackLink) => {
    if (opening) return;
    setOpening(true);
    setFailedLink(null);
    setCopyFailed(false);
    // The Tauri opener API confirms the call, not whether the user is signed into GitHub.
    // If the native open fails, surface a copyable public URL.
    const didOpen = await attemptFeedbackLink(destination);
    if (didOpen) dismiss();
    else setFailedLink(destination);
    setOpening(false);
  };

  const copyLink = async () => {
    if (!failedLink) return;
    try {
      await navigator.clipboard.writeText(FEEDBACK_LINKS[failedLink]);
      dismiss();
    } catch {
      // The URL stays selectable below if the OS denies clipboard access.
      setCopyFailed(true);
    }
  };

  return (
    <aside
      role="region"
      aria-label={fr ? "Votre avis sur EVE Tools Suite" : "Your EVE Tools Suite feedback"}
      className="fixed bottom-4 left-1/2 z-[85] max-h-[min(75vh,36rem)] w-[min(32rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={fr ? "Fermer la demande d'avis" : "Dismiss feedback invitation"}
      >
        <X className="h-4 w-4" />
      </button>

      {answer === null ? (
        <>
          <h3 className="pr-7 text-sm font-semibold">
            {fr ? "Ce résultat vous a-t-il aidé ?" : "Did this result help you?"}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {fr ? "Un clic suffit. Aucun contenu EVE n'est envoyé." : "One click is enough. No EVE content is sent."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => respond(true)}>
              <ThumbsUp className="h-4 w-4" />{fr ? "Oui" : "Yes"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => respond(false)}>
              <ThumbsDown className="h-4 w-4" />{fr ? "Non" : "No"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {fr ? "Pas maintenant" : "Not now"}
            </Button>
          </div>
        </>
      ) : (
        <div aria-live="polite">
          <h3 className="flex items-center gap-2 pr-7 text-sm font-semibold">
            <Check className="h-4 w-4 text-success" />
            {fr ? "Merci pour votre retour." : "Thanks for your feedback."}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {answer
              ? (fr ? "Vous appréciez EVE Tools ? Soutenez le projet ou échangez avec la communauté." : "Enjoying EVE Tools? Support the project or join the community.")
              : (fr ? "Un problème ou une idée ? Vous pouvez la partager sur GitHub ou Discord." : "Have a problem or an idea? Share it on GitHub or Discord.")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={answer ? "default" : "outline"}
              onClick={() => void visit("star")}
              disabled={opening}
              className="min-w-0 px-2"
            >
              <Star className="h-4 w-4" />{fr ? "Star sur GitHub" : "Star on GitHub"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void visit("discord")}
              disabled={opening}
              className="min-w-0 px-2"
            >
              <MessageCircle className="h-4 w-4" />Discord
            </Button>
            <Button
              size="sm"
              variant={answer ? "ghost" : "default"}
              onClick={() => void visit("issue")}
              disabled={opening}
              className="col-span-2 justify-center"
            >
              <ExternalLink className="h-4 w-4" />
              {fr ? "Signaler un bug ou proposer une idée sur GitHub" : "Report a bug or suggest an idea on GitHub"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {fr ? "GitHub demande un compte pour créer une issue ; Discord reste une alternative." : "GitHub requires an account to create an issue; Discord is an alternative."}
          </p>

          {failedLink && (
            <div className="mt-3 space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs" role="alert">
              <p>{fr ? "Le navigateur ne s'est pas ouvert. Copiez ce lien pour l'ouvrir vous-même :" : "The browser did not open. Copy this link to open it yourself:"}</p>
              <input
                readOnly
                aria-label={fr ? "Adresse à copier" : "Link to copy"}
                value={FEEDBACK_LINKS[failedLink]}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground"
              />
              <Button size="sm" variant="outline" onClick={() => void copyLink()}>
                <ClipboardCopy className="h-4 w-4" />{fr ? "Copier le lien" : "Copy link"}
              </Button>
              {copyFailed && <p className="text-muted-foreground">{fr ? "La copie automatique a échoué : sélectionnez l'adresse pour la copier." : "Automatic copy failed: select the address to copy it."}</p>}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{fr ? "Cette invitation se fermera automatiquement." : "This invitation will close automatically."}</span>
            <button type="button" onClick={dismiss} className="shrink-0 font-medium text-primary hover:underline">
              {fr ? "Fermer" : "Dismiss"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
