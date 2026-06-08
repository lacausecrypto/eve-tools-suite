import { useState } from "react";
import { Hammer, Loader2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { loadFit, type LoadResult } from "../api";
import { DAMAGE_PROFILES, profileById, useAtelier, type SavedFit } from "../store";
import { fmtHp } from "../lib/format";
import { isAppError } from "../lib/errors";
import { AnalysisView } from "./AnalysisView";

const SAMPLE = `[Vexor, Exemple Drone]
Drone Damage Amplifier II
Drone Damage Amplifier II
Damage Control II
800mm Steel Plates II
Multispectrum Energized Membrane II

10MN Afterburner II
Medium Capacitor Booster II
Warp Disruptor II
Stasis Webifier II

Medium Energy Neutralizer II
250mm Railgun II, Caldari Navy Antimatter Charge M
250mm Railgun II, Caldari Navy Antimatter Charge M

Medium Trimark Armor Pump II
Medium Trimark Armor Pump II

Hammerhead II x5
Hobgoblin II x5`;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: LoadResult };

export function AnalyzerView() {
  const t = useT();
  const { eft, allFiveHp, profileId, savedFits, setEft, setAllFiveHp, setProfileId, saveFit, removeFit } =
    useAtelier();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function analyze(text = eft) {
    if (!text.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const result = await loadFit(text, { allFiveHp, profile: profileById(profileId) });
      setStatus({ kind: "done", result });
    } catch (e) {
      const message = isTauri()
        ? e instanceof Error
          ? e.message
          : String(e)
        : e instanceof Error && isAppError(e.message)
          ? e.message
          : t("atelier.err.analyzeOffline");
      setStatus({ kind: "error", message });
    }
  }

  function loadSample() {
    setEft(SAMPLE);
    void analyze(SAMPLE);
  }

  function save() {
    if (status.kind !== "done") return;
    const a = status.result.analysis;
    saveFit({
      shipTypeId: a.shipTypeId,
      shipName: a.shipName,
      fitName: a.fitName,
      eft,
      summary: { ehp: a.tank.ehp, dps: a.dps.total, capStable: a.cap.stable, align: a.nav.alignTime },
    });
  }

  function reload(f: SavedFit) {
    setEft(f.eft);
    void analyze(f.eft);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Colonne saisie */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Hammer className="h-4 w-4" /> {t("atelier.eft.title")}
          </div>
          <Textarea
            value={eft}
            onChange={(e) => setEft(e.target.value)}
            data-tour="atelier.eft" placeholder={t("atelier.eft.placeholder")}
            className="h-64 resize-none font-mono text-xs"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => analyze()} disabled={!eft.trim() || status.kind === "loading"}>
              {status.kind === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t("atelier.btn.analyze")}
            </Button>
            <Button variant="outline" onClick={loadSample} disabled={status.kind === "loading"}>
              <Wand2 className="h-4 w-4" /> {t("atelier.btn.example")}
            </Button>
            {status.kind === "done" && (
              <Button variant="ghost" onClick={save}>
                <Save className="h-4 w-4" /> {t("atelier.btn.save")}
              </Button>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="text-sm font-semibold">{t("atelier.assumptions.title")}</div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              {t("atelier.opt.skills")}
              <span className="block text-[11px] text-muted-foreground">{t("atelier.opt.skills.sub")}</span>
            </span>
            <Switch
              checked={allFiveHp}
              onCheckedChange={(v) => {
                setAllFiveHp(v);
                if (status.kind === "done") void analyze();
              }}
            />
          </label>
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">{t("atelier.opt.profile")}</span>
            <Select
              value={profileId}
              onValueChange={(v) => {
                setProfileId(v);
                if (status.kind === "done") void analyze();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_PROFILES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {t("atelier.profile." + p.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Historique */}
        {savedFits.length > 0 && (
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-2 text-sm font-semibold">{t("atelier.saved.title")}</div>
            <div className="space-y-1.5">
              {savedFits.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm"
                >
                  <img src={typeIconUrl(f.shipTypeId, 32)} alt="" className="h-6 w-6 shrink-0 rounded" />
                  <button onClick={() => reload(f)} className="min-w-0 flex-1 truncate text-left hover:underline">
                    <span className="font-medium">{f.shipName}</span>{" "}
                    <span className="text-xs text-muted-foreground">{f.fitName}</span>
                  </button>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {fmtHp(f.summary.ehp)} EHP
                  </span>
                  <button onClick={() => removeFit(f.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Colonne résultats */}
      <div>
        {status.kind === "idle" && <Intro />}
        {status.kind === "loading" && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("atelier.analyze.loading")}
          </div>
        )}
        {status.kind === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
            {status.message}
          </div>
        )}
        {status.kind === "done" && (
          <AnalysisView a={status.result.analysis} unresolved={status.result.unresolved} />
        )}
      </div>
    </div>
  );
}

function Intro() {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
      <Hammer className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="mx-auto max-w-md">{t("atelier.intro.analyze")}</p>
      <div className="mt-3 flex justify-center gap-2">
        <Badge variant="muted">{t("atelier.badge.ehpProfile")}</Badge>
        <Badge variant="muted">{t("atelier.badge.stacking")}</Badge>
        <Badge variant="muted">{t("atelier.badge.capStability")}</Badge>
      </div>
    </div>
  );
}
