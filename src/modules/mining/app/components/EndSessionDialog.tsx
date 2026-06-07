import { useState } from "react";
import { Flag, Download, AlertTriangle, Pickaxe } from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { Session } from "@mining/types";
import { downloadReport } from "@mining/lib/report";
import { minedSummary, minedPayout } from "@mining/lib/domain";
import { formatIsk } from "@mining/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@mining/components/ui/dialog";
import { Button } from "@mining/components/ui/button";
import { Input } from "@mining/components/ui/input";
import { Label } from "@mining/components/ui/label";

export function EndSessionDialog({ session }: { session: Session }) {
  const t = useT();
  const endSession = useStore((s) => s.endSession);
  const setTotalIsk = useStore((s) => s.setSessionTotalIsk);
  const setIskOverride = useStore((s) => s.setIskOverride);
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const [open, setOpen] = useState(false);
  const [isk, setIsk] = useState(session.totalIsk || 0);

  const isMined = session.lootEvents.length > 0;
  const autoValue = isMined ? minedSummary(session).totalValue : 0;
  const override = session.iskOverride ?? 0;
  const effectiveValue = override > 0 ? override : autoValue;
  const minedPayoutTotal = isMined ? minedPayout(session).totalPayout : 0;

  function finish(withReport: boolean) {
    if (!isMined) setTotalIsk(session.id, isk);
    endSession(session.id);
    if (withReport) {
      // la session vient d'être clôturée ; on regénère avec endedAt
      downloadReport(
        {
          ...session,
          totalIsk: isMined ? session.totalIsk : isk,
          status: "ended",
          endedAt: Date.now(),
        },
        members,
        groups,
        t
      );
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Flag className="h-4 w-4" /> {t("mining.end.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("mining.end.title", { name: session.name })}
          </DialogTitle>
          <DialogDescription>
            {t("mining.end.descBase")}
            {isMined
              ? t("mining.end.descMined")
              : t("mining.end.descManual")}
          </DialogDescription>
        </DialogHeader>
        {isMined ? (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Pickaxe className="h-3.5 w-3.5" /> {t("mining.end.minedValueLabel")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={1000000}
                value={effectiveValue ? Math.round(effectiveValue) : ""}
                placeholder="0"
                onChange={(e) =>
                  setIskOverride(session.id, Number(e.target.value) || 0)
                }
                className="pr-24 font-mono text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums">
                {formatIsk(effectiveValue)} ISK
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {override > 0
                  ? t("mining.end.manualCorrected")
                  : t("mining.end.autoJita")}
                {minedPayoutTotal !== effectiveValue &&
                  t("mining.end.toPayAfterBuyback", {
                    isk: formatIsk(minedPayoutTotal),
                  })}
              </span>
              {override > 0 && (
                <button
                  onClick={() => setIskOverride(session.id, 0)}
                  className="text-primary hover:underline"
                >
                  {t("mining.end.resetJita", { isk: formatIsk(autoValue) })}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>{t("mining.end.totalValueLabel")}</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={1000000}
                value={isk || ""}
                placeholder="0"
                onChange={(e) => setIsk(Number(e.target.value) || 0)}
                className="pr-24 font-mono text-base"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums">
                {formatIsk(isk)} ISK
              </span>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("mining.end.cancel")}
          </Button>
          <Button variant="outline" onClick={() => finish(false)}>
            <Flag className="h-4 w-4" /> {t("mining.end.close")}
          </Button>
          <Button onClick={() => finish(true)}>
            <Download className="h-4 w-4" /> {t("mining.end.closeReport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
