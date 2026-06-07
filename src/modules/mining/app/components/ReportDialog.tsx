import { useState } from "react";
import { FileText, Download, Copy, Check, Eye, Code2 } from "lucide-react";
import { useT } from "@/core/i18n";
import type { Session } from "@mining/types";
import { useStore } from "@mining/store/useStore";
import { buildReportMarkdown, downloadReport } from "@mining/lib/report";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mining/components/ui/dialog";
import { Button } from "@mining/components/ui/button";
import { ReportView } from "@mining/components/ReportView";
import { cn } from "@mining/lib/utils";

export function ReportDialog({
  session,
  trigger,
}: {
  session: Session;
  trigger: React.ReactNode;
}) {
  const t = useT();
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"pretty" | "md">("pretty");

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        buildReportMarkdown(session, members, groups, t)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("mining.reportDlg.title")}
            <div className="ml-auto flex items-center rounded-lg border border-border bg-background/60 p-0.5 text-xs">
              <button
                onClick={() => setView("pretty")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
                  view === "pretty"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3.5 w-3.5" /> {t("mining.reportDlg.view")}
              </button>
              <button
                onClick={() => setView("md")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
                  view === "md"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code2 className="h-3.5 w-3.5" /> {t("mining.reportDlg.markdown")}
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto scrollbar-thin pr-1 -mr-1">
          {view === "pretty" ? (
            <ReportView session={session} members={members} groups={groups} />
          ) : (
            <pre className="rounded-lg border border-border bg-background/60 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
              {buildReportMarkdown(session, members, groups, t)}
            </pre>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" onClick={copy}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> {t("mining.reportDlg.copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> {t("mining.reportDlg.copyMd")}
              </>
            )}
          </Button>
          <Button onClick={() => downloadReport(session, members, groups, t)}>
            <Download className="h-4 w-4" /> {t("mining.reportDlg.downloadMd")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
