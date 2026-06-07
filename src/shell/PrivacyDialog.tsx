import { create } from "zustand";
import { ShieldCheck, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/core/settings";
import { useT } from "@/core/i18n";
import { openExternal } from "@/core/external";
import { PRIVACY_URL } from "@/core/app";
import { PRIVACY_CONTENT } from "./privacyContent";

/** État d'ouverture de la modal de confidentialité (déclenchable de partout). */
interface PrivacyDialogState {
  open: boolean;
  show: () => void;
  setOpen: (v: boolean) => void;
}
export const usePrivacyDialog = create<PrivacyDialogState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  setOpen: (open) => set({ open }),
}));

/**
 * Politique de confidentialité **affichée dans l'app** (modal scrollable,
 * bilingue selon la langue active). Montée une fois dans `App` ; ouverte via
 * `usePrivacyDialog.getState().show()` depuis le consentement et les réglages.
 */
export function PrivacyDialog() {
  const t = useT();
  const open = usePrivacyDialog((s) => s.open);
  const setOpen = usePrivacyDialog((s) => s.setOpen);
  const lang = useSettings((s) => s.language);
  const doc = PRIVACY_CONTENT[lang];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-fleur" /> {t("settings.privacyPolicy")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm scrollbar-thin">
          <p className="text-[11px] text-muted-foreground">{doc.updated}</p>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-muted-foreground">
            {doc.controller.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <p className="text-muted-foreground">{doc.intro}</p>

          {doc.sections.map((sec) => (
            <section key={sec.heading} className="space-y-1.5">
              <h3 className="font-semibold">{sec.heading}</h3>
              {sec.paragraphs?.map((p) => (
                <p key={p} className="text-muted-foreground">
                  {p}
                </p>
              ))}
              {sec.bullets && (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {sec.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <button
            onClick={() => void openExternal(PRIVACY_URL)}
            className="inline-flex items-center gap-1 text-xs text-fleur hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t("privacy.viewOnline")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
