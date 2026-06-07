import { useMemo, useState } from "react";
import {
  Brain,
  Download,
  GraduationCap,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useT } from "@/core/i18n";
import { useAccounts } from "@/core/account";
import { sso } from "@/core/sso/session";
import { toast } from "@/core/toast";
import { cn } from "@/lib/utils";
import { SKILLS, type Attr } from "./data/skills";
import {
  ATTRS,
  ATTR_LABEL,
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL,
  IMPLANT_MAX,
  effective,
  spPerMinute,
  type AttrSet,
} from "./lib/sp";
import {
  pairTotals,
  planRows,
  planSeconds,
  totalSp,
  type PlanRow,
} from "./lib/plan";
import { optimizeRemap } from "./lib/optimize";
import { fmtDuration, fmtSp } from "./lib/format";
import { useSkills } from "./store";
import { fetchAttributes, fetchSkillQueue } from "./api";

const ROMAN = ["0", "I", "II", "III", "IV", "V"];
const LEVELS = [0, 1, 2, 3, 4, 5];

export function SkillsApp() {
  const t = useT();
  const plan = useSkills((s) => s.plan);
  const attrs = useSkills((s) => s.attrs);
  const implants = useSkills((s) => s.implants);
  const alpha = useSkills((s) => s.alpha);
  const addSkill = useSkills((s) => s.addSkill);
  const removeSkill = useSkills((s) => s.removeSkill);
  const setLevels = useSkills((s) => s.setLevels);
  const clearPlan = useSkills((s) => s.clearPlan);
  const setAttrs = useSkills((s) => s.setAttrs);
  const setImplants = useSkills((s) => s.setImplants);
  const setAlpha = useSkills((s) => s.setAlpha);
  const importQueue = useSkills((s) => s.importQueue);

  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);

  const sessions = useAccounts((s) => s.sessions);
  const activeId = useAccounts((s) => s.activeId);
  const active = sessions.find((s) => s.characterId === activeId) ?? null;

  const rows = useMemo(() => planRows(plan), [plan]);
  const pairs = useMemo(() => pairTotals(rows), [rows]);
  const tSp = useMemo(() => totalSp(rows), [rows]);

  const currentSeconds = useMemo(
    () => planSeconds(pairs, attrs, implants, alpha),
    [pairs, attrs, implants, alpha],
  );
  const optimal = useMemo(
    () => optimizeRemap(pairs, implants, alpha),
    [pairs, implants, alpha],
  );
  const saved = currentSeconds - optimal.seconds;

  const attrSum = ATTRS.reduce((a, k) => a + attrs[k], 0);
  const sumValid = attrSum === ATTR_TOTAL;

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return SKILLS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 40);
  }, [search]);

  async function onImportQueue() {
    if (!active) return;
    setImporting(true);
    try {
      const items = await fetchSkillQueue(active.characterId);
      importQueue(items);
      try {
        setAttrs(await fetchAttributes(active.characterId));
      } catch {
        /* attributs optionnels */
      }
      toast.success(t("sk.import.ok"), `${items.length}`);
    } catch (e) {
      toast.error(t("sk.import.err"), String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-5 animate-fade-in lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ----- Configuration ----- */}
      <div className="space-y-4">
        {/* Import & clone */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-fleur" /> {t("sk.character")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onImportQueue}
                disabled={!active || !sso.available() || importing}
                title={
                  sso.available()
                    ? t("sk.import.tip")
                    : t("sk.import.desktop")
                }
                className="flex-1"
              >
                <Download className="h-4 w-4" />
                {importing ? t("sk.import.loading") : t("sk.import")}
              </Button>
              <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
                {[false, true].map((a) => (
                  <button
                    key={String(a)}
                    onClick={() => setAlpha(a)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      alpha === a
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a ? "Alpha" : "Omega"}
                  </button>
                ))}
              </div>
            </div>
            {active ? (
              <p className="text-xs text-muted-foreground">{active.characterName}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("sk.import.hint")}</p>
            )}
          </CardContent>
        </Card>

        {/* Attributs & implants */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-fleur" /> {t("sk.attrs")}
              </span>
              <Badge variant={sumValid ? "muted" : "destructive"}>
                Σ {attrSum} / {ATTR_TOTAL}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t("sk.attr")} (17–27)
              </span>
              <span className="text-center text-[10px] uppercase text-muted-foreground">
                {t("sk.base")}
              </span>
              <span className="text-center text-[10px] uppercase text-muted-foreground">
                +impl.
              </span>
              {ATTRS.map((k) => (
                <Row key={k} label={ATTR_LABEL[k]}>
                  <NumBox
                    value={attrs[k]}
                    min={ATTR_MIN}
                    max={ATTR_MAX}
                    onChange={(v) => setAttrs({ ...attrs, [k]: v })}
                  />
                  <NumBox
                    value={implants[k]}
                    min={0}
                    max={IMPLANT_MAX}
                    onChange={(v) => setImplants({ ...implants, [k]: v })}
                  />
                </Row>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recherche de compétences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("sk.add")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("sk.search")}
              spellCheck={false}
            />
            {results.length > 0 && (
              <div className="mt-2 max-h-72 space-y-1 overflow-auto scrollbar-thin pr-1">
                {results.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addSkill(s.id, 0, 5)}
                    className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{s.name}</span>
                    <Badge variant="muted" className="shrink-0 text-[10px]">
                      x{s.rank}
                    </Badge>
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      {s.p}/{s.s}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----- Plan & remap ----- */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label={t("sk.total.sp")} value={fmtSp(tSp)} />
          <Kpi label={t("sk.total.time")} value={fmtDuration(currentSeconds)} />
          <Kpi label={t("sk.skills")} value={String(rows.length)} />
        </div>

        {/* Remap optimal */}
        <Card className="border-fleur/40 bg-fleur/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wand2 className="h-4 w-4 text-fleur" /> {t("sk.remap")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sk.remap.empty")}</p>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {ATTRS.map((k) => {
                    const delta = optimal.base[k] - attrs[k];
                    return (
                      <div
                        key={k}
                        className="rounded-md border border-border/50 bg-background/40 p-2 text-center"
                      >
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {k}
                        </div>
                        <div className="text-lg font-semibold tabular-nums text-fleur">
                          {optimal.base[k]}
                        </div>
                        <div
                          className={cn(
                            "text-[10px] tabular-nums",
                            delta > 0
                              ? "text-success"
                              : delta < 0
                                ? "text-destructive"
                                : "text-muted-foreground",
                          )}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t("sk.remap.time")} </span>
                    <span className="font-semibold">
                      {fmtDuration(optimal.seconds)}
                    </span>
                    {saved > 1 && (
                      <Badge variant="success" className="ml-2 gap-1">
                        <Sparkles className="h-3 w-3" /> −{fmtDuration(saved)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setAttrs(optimal.base)}
                    disabled={saved <= 1}
                  >
                    {t("sk.remap.apply")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{t("sk.plan")}</CardTitle>
            {rows.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearPlan}>
                <Trash2 className="h-4 w-4" /> {t("sk.clear")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("sk.plan.empty")}
              </p>
            ) : (
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <PlanRowView
                    key={r.skill.id}
                    row={r}
                    attrs={attrs}
                    implants={implants}
                    alpha={alpha}
                    onLevels={(from, to) => setLevels(r.skill.id, from, to)}
                    onRemove={() => removeSkill(r.skill.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Sous-composants ---------------------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="truncate">{label}</span>
      {children}
    </>
  );
}

function NumBox({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className="h-7 w-14 rounded-md border border-input bg-background/60 px-2 text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function PlanRowView({
  row,
  attrs,
  implants,
  alpha,
  onLevels,
  onRemove,
}: {
  row: PlanRow;
  attrs: AttrSet;
  implants: AttrSet;
  alpha: boolean;
  onLevels: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const eff = effective(attrs, implants);
  const perMin = spPerMinute(
    eff[row.skill.p as Attr],
    eff[row.skill.s as Attr],
    alpha,
  );
  const seconds = perMin > 0 ? (row.sp / perMin) * 60 : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm">
      <span className="min-w-32 flex-1 truncate font-medium">
        {row.skill.name}
      </span>
      <span className="text-[10px] uppercase text-muted-foreground">
        {row.skill.p}/{row.skill.s}
      </span>
      <LevelSelect
        value={row.from}
        onChange={(v) => onLevels(v, Math.max(v, row.to))}
      />
      <span className="text-muted-foreground">→</span>
      <LevelSelect
        value={row.to}
        onChange={(v) => onLevels(Math.min(row.from, v), v)}
      />
      <span className="w-16 text-right tabular-nums text-muted-foreground">
        {fmtSp(row.sp)}
      </span>
      <span className="w-20 text-right tabular-nums">
        {fmtDuration(seconds)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LevelSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(parseInt(v, 10))}>
      <SelectTrigger className="h-7 w-14 px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEVELS.map((l) => (
          <SelectItem key={l} value={String(l)}>
            {ROMAN[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
