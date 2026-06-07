import { useMemo, useState } from "react";
import {
  Wallet,
  Copy,
  Check,
  ClipboardList,
  Coins,
  Pickaxe,
  RotateCcw,
  Telescope,
  Crown,
  Scale,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { useStore } from "@mining/store/useStore";
import type { PayoutBasis, Session } from "@mining/types";
import {
  minedSummary,
  sessionPayout,
  effectivePayoutBasis,
} from "@mining/lib/domain";
import { formatIsk, formatIskFull } from "@mining/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@mining/components/ui/card";
import { Button } from "@mining/components/ui/button";
import { Input } from "@mining/components/ui/input";
import { Label } from "@mining/components/ui/label";
import { Badge } from "@mining/components/ui/badge";
import { Slider } from "@mining/components/ui/slider";
import { cn } from "@mining/lib/utils";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PayoutPanel({ session }: { session: Session }) {
  const t = useT();
  const members = useStore((s) => s.members);
  const groups = useStore((s) => s.playerGroups);
  const togglePaid = useStore((s) => s.togglePaid);
  const setTotalIsk = useStore((s) => s.setSessionTotalIsk);
  const setBuybackPct = useStore((s) => s.setBuybackPct);
  const setIskOverride = useStore((s) => s.setIskOverride);
  const setScoutPct = useStore((s) => s.setScoutPct);
  const setFcPct = useStore((s) => s.setFcPct);
  const setPayoutBasis = useStore((s) => s.setPayoutBasis);

  const readOnly = session.status === "ended";
  const hasScout = session.members.some((m) => m.scout);
  const hasFc = session.members.some((m) => m.fc);
  const isMined = session.lootEvents.length > 0;
  const basis = effectivePayoutBasis(session);

  const BASES: { v: PayoutBasis; label: string; desc: string }[] = [
    {
      v: "mined",
      label: t("mining.payout.basis.mined"),
      desc: t("mining.payout.basis.minedDesc"),
    },
    {
      v: "equal",
      label: t("mining.payout.basis.equal"),
      desc: t("mining.payout.basis.equalDesc"),
    },
    {
      v: "presence",
      label: t("mining.payout.basis.presence"),
      desc: t("mining.payout.basis.presenceDesc"),
    },
  ];

  const autoValue = useMemo(
    () => (isMined ? minedSummary(session).totalValue : 0),
    [isMined, session]
  );
  const override = session.iskOverride ?? 0;
  const effectiveValue = override > 0 ? override : autoValue;

  const rows = useMemo(
    () => sessionPayout(session, members, groups),
    [session, members, groups]
  );
  const paid = useMemo(
    () => new Set(session.paidPlayers ?? []),
    [session.paidPlayers]
  );
  const total = rows.reduce((a, r) => a + r.isk, 0);
  const paidCount = rows.filter((r) => paid.has(r.key)).length;

  const [copied, setCopied] = useState<string | null>(null);
  async function copy(text: string, tag: string) {
    if (await copyText(text)) {
      setCopied(tag);
      window.setTimeout(() => setCopied(null), 1200);
    }
  }
  function copyAll(onlyUnpaid: boolean) {
    const list = onlyUnpaid ? rows.filter((r) => !paid.has(r.key)) : rows;
    const txt = list
      .map((r) => `${r.name} — ${formatIskFull(r.isk)}`)
      .join("\n");
    copy(txt, onlyUnpaid ? "__unpaid__" : "__all__");
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          {t("mining.payout.title")}
          {rows.length > 0 && (
            <Badge variant={paidCount === rows.length ? "success" : "muted"}>
              {t("mining.payout.paidCount", { paid: paidCount, total: rows.length })}
            </Badge>
          )}
        </CardTitle>

        {/* Base de répartition entre membres */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" /> {t("mining.payout.basisLabel")}
          </Label>
          <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
            {BASES.map((opt) => {
              const disabled =
                readOnly || (opt.v === "mined" && !isMined);
              return (
                <button
                  key={opt.v}
                  disabled={disabled}
                  title={opt.v === "mined" && !isMined ? t("mining.payout.noLootImported") : undefined}
                  onClick={() => setPayoutBasis(session.id, opt.v)}
                  className={cn(
                    "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                    basis === opt.v
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    opt.v === "mined" &&
                      !isMined &&
                      "opacity-40 cursor-not-allowed"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {BASES.find((b) => b.v === basis)?.desc}
          </p>
        </div>

        {/* Contrôles de valorisation selon le mode */}
        {isMined ? (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Pickaxe className="h-3.5 w-3.5" /> {t("mining.payout.lootValueLabel")}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={1000000}
                  value={effectiveValue ? Math.round(effectiveValue) : ""}
                  placeholder="0"
                  disabled={readOnly}
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
                    ? t("mining.payout.manualCorrected")
                    : t("mining.payout.autoJita")}
                </span>
                {override > 0 && !readOnly && (
                  <button
                    onClick={() => setIskOverride(session.id, 0)}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />{" "}
                    {t("mining.payout.backToJita", { isk: formatIsk(autoValue) })}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("mining.payout.buybackRate")}</span>
                <span className="tabular-nums text-foreground font-semibold">
                  {session.buybackPct ?? 100}%
                </span>
              </div>
              <Slider
                value={session.buybackPct ?? 100}
                disabled={readOnly}
                onValueChange={(v) => setBuybackPct(session.id, v)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> {t("mining.payout.totalValueLabel")}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={1000000}
                value={session.totalIsk || ""}
                placeholder="0"
                disabled={readOnly}
                onChange={(e) =>
                  setTotalIsk(session.id, Number(e.target.value) || 0)
                }
                className="pr-24 font-mono text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums">
                {formatIsk(session.totalIsk)} ISK
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("mining.payout.presenceProrata")}
            </p>
          </div>
        )}

        {hasFc && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-fc" /> {t("mining.payout.fcShare")}
              </span>
              <span className="tabular-nums text-foreground font-semibold">
                {session.fcPct ?? 0}%
              </span>
            </div>
            <Slider
              value={session.fcPct ?? 0}
              disabled={readOnly}
              onValueChange={(v) => setFcPct(session.id, v)}
              color="hsl(var(--fc))"
            />
          </div>
        )}

        {hasScout && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Telescope className="h-3.5 w-3.5" /> {t("mining.payout.scoutShare")}
              </span>
              <span className="tabular-nums text-foreground font-semibold">
                {session.scoutPct ?? 0}%
              </span>
            </div>
            <Slider
              value={session.scoutPct ?? 0}
              disabled={readOnly}
              onValueChange={(v) => setScoutPct(session.id, v)}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isMined
              ? t("mining.payout.emptyMined")
              : t("mining.payout.emptyManual")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => copyAll(false)}
              >
                {copied === "__all__" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ClipboardList className="h-4 w-4" />
                )}
                {t("mining.payout.copyList")}
              </Button>
              {paidCount < rows.length && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyAll(true)}
                  title={t("mining.payout.copyUnpaidTitle")}
                >
                  {copied === "__unpaid__" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {t("mining.payout.remaining")}
                </Button>
              )}
            </div>

            <ul className="space-y-1.5">
              {rows.map((r) => {
                const isPaid = paid.has(r.key);
                return (
                  <li
                    key={r.key}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                      isPaid
                        ? "border-success/30 bg-success/5"
                        : "border-border/60 bg-background/40"
                    )}
                  >
                    <button
                      onClick={() => togglePaid(session.id, r.key)}
                      title={isPaid ? t("mining.payout.markUnpaid") : t("mining.payout.markPaid")}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border shrink-0 transition-colors",
                        isPaid
                          ? "bg-success border-success text-success-foreground"
                          : "border-muted-foreground/40 hover:border-success"
                      )}
                    >
                      {isPaid && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <span
                      className={cn(
                        "font-medium flex-1 truncate min-w-0",
                        isPaid && "line-through text-muted-foreground"
                      )}
                    >
                      {r.name}
                    </span>
                    {r.fc && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-[9px] shrink-0 border-fc/40 bg-fc/15 text-fc"
                      >
                        <Crown className="h-2.5 w-2.5" /> FC
                      </Badge>
                    )}
                    {r.scout && (
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[9px] shrink-0"
                      >
                        <Telescope className="h-2.5 w-2.5" /> scout
                      </Badge>
                    )}
                    <span className="tabular-nums text-[11px] text-muted-foreground shrink-0 w-10 text-right">
                      {total > 0 ? ((r.isk / total) * 100).toFixed(1) : "0"}%
                    </span>
                    <span className="tabular-nums font-semibold text-primary text-sm shrink-0">
                      {formatIskFull(r.isk)}
                    </span>
                    <button
                      onClick={() =>
                        copy(String(Math.round(r.isk)), r.key)
                      }
                      title={t("mining.payout.copyAmount")}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copied === r.key ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="h-4 w-4" /> {t("mining.payout.totalToPay")}
              </span>
              <span className="font-semibold tabular-nums text-primary">
                {formatIskFull(total)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
