import { useState } from "react";
import { Check, Copy, Loader2, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { generateFit, type GenerateResult } from "../api";
import { ROLES, type GenNeed, type Role } from "../lib/generate";
import type { WeaponRange, WeaponSystem } from "../data/catalog";
import { HULL_NAMES } from "../data/hulls";
import { profileById, useAtelier, type SavedFit } from "../store";
import { fmtHp } from "../lib/format";
import { isAppError } from "../lib/errors";
import { AnalysisView } from "./AnalysisView";

const WEAPON_IDS: ("auto" | WeaponSystem)[] = ["auto", "hybrid", "projectile", "laser", "missile", "drone"];

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: GenerateResult };

export function GeneratorView() {
  const t = useT();
  const { allFiveHp, profileId, savedFits, saveFit, removeFit } = useAtelier();
  const [need, setNeed] = useState<GenNeed>({
    hull: "",
    role: "ratting",
    tank: "auto",
    weapon: "auto",
    range: "close",
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const set = (patch: Partial<GenNeed>) => setNeed((n) => ({ ...n, ...patch }));

  async function run() {
    if (!need.hull.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const result = await generateFit(need, { allFiveHp, profile: profileById(profileId) });
      setStatus({ kind: "done", result });
    } catch (e) {
      const message = isTauri()
        ? e instanceof Error
          ? e.message
          : String(e)
        : e instanceof Error && isAppError(e.message)
          ? e.message
          : t("atelier.err.genOffline");
      setStatus({ kind: "error", message });
    }
  }

  function save() {
    if (status.kind !== "done") return;
    const { analysis, eft } = status.result;
    saveFit({
      shipTypeId: analysis.shipTypeId,
      shipName: analysis.shipName,
      fitName: analysis.fitName,
      eft,
      summary: { ehp: analysis.tank.ehp, dps: analysis.dps.total, capStable: analysis.cap.stable, align: analysis.nav.alignTime },
    });
  }

  async function copyEft() {
    if (status.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(status.result.eft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papier indisponible */
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      {/* Formulaire de besoin */}
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Wand2 className="h-4 w-4" /> {t("atelier.need")}
          </div>

          <Field label={t("atelier.field.hull")}>
            <Input
              value={need.hull}
              onChange={(e) => set({ hull: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder={t("atelier.hull.placeholder")}
              list="atelier-hulls"
              spellCheck={false}
            />
            <datalist id="atelier-hulls">
              {HULL_NAMES.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </Field>

          <Field label={t("atelier.field.role")}>
            <Select value={need.role} onValueChange={(v) => set({ role: v as Role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {t("atelier.role." + r.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={t("atelier.field.tank")}>
              <Select value={need.tank} onValueChange={(v) => set({ tank: v as GenNeed["tank"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("atelier.tank.auto")}</SelectItem>
                  <SelectItem value="armor">{t("atelier.tank.armor")}</SelectItem>
                  <SelectItem value="shield">{t("atelier.tank.shield")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("atelier.field.range")}>
              <Select value={need.range} onValueChange={(v) => set({ range: v as WeaponRange })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">{t("atelier.range.close")}</SelectItem>
                  <SelectItem value="long">{t("atelier.range.long")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("atelier.field.weapon")}>
            <Select value={need.weapon} onValueChange={(v) => set({ weapon: v as GenNeed["weapon"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEAPON_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {t("atelier.weapon." + id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Button onClick={run} disabled={!need.hull.trim() || status.kind === "loading"} className="w-full">
            {status.kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("atelier.btn.generate")}
          </Button>
          <p className="text-[11px] text-muted-foreground/70">{t("atelier.gen.helper")}</p>
        </div>

        {/* Historique */}
        {savedFits.length > 0 && (
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-2 text-sm font-semibold">{t("atelier.saved.title")}</div>
            <div className="space-y-1.5">
              {savedFits.map((f) => (
                <SavedRow key={f.id} f={f} onRemove={() => removeFit(f.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Résultat */}
      <div>
        {status.kind === "idle" && <Intro />}
        {status.kind === "loading" && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("atelier.gen.loading")}
          </div>
        )}
        {status.kind === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
            {status.message}
          </div>
        )}
        {status.kind === "done" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={save}>
                <Save className="h-4 w-4" /> {t("atelier.gen.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={copyEft}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("atelier.gen.copied") : t("atelier.gen.copy")}
              </Button>
              {status.result.mitigations.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("atelier.gen.adjustments")} {status.result.mitigations.join(" · ")}
                </span>
              )}
            </div>
            <AnalysisView a={status.result.analysis} unresolved={status.result.unresolved} />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SavedRow({ f, onRemove }: { f: SavedFit; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm">
      <img src={typeIconUrl(f.shipTypeId, 32)} alt="" className="h-6 w-6 shrink-0 rounded" />
      <div className="min-w-0 flex-1 truncate">
        <span className="font-medium">{f.shipName}</span>{" "}
        <span className="text-xs text-muted-foreground">{f.fitName}</span>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{fmtHp(f.summary.ehp)} EHP</span>
      <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Intro() {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
      <Wand2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="mx-auto max-w-md">{t("atelier.intro.gen")}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Badge variant="muted">{t("atelier.badge.roles")}</Badge>
        <Badge variant="muted">{t("atelier.badge.weapons")}</Badge>
        <Badge variant="muted">{t("atelier.badge.fitable")}</Badge>
      </div>
    </div>
  );
}
