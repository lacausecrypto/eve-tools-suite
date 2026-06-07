import { ShieldCheck, Database } from "lucide-react";
import { useT } from "@/core/i18n";

/** Pied de page compact : confidentialité locale + attribution légale CCP.
 *  Le texte d'attribution complet est accessible au survol et dans Réglages. */
export function ComplianceFooter() {
  const t = useT();
  return (
    <footer className="flex h-7 shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-0 border-t border-border/40 px-6 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Database className="h-3 w-3 text-fleur" /> {t("footer.localData")}
      </span>
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-fleur" /> {t("footer.eulaSafe")}
      </span>
      <span
        className="cursor-help text-muted-foreground/60"
        title={t("footer.attribution")}
      >
        {t("footer.copyright")}
      </span>
    </footer>
  );
}
