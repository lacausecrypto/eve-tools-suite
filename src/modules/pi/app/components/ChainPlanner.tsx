import { useMemo, useState } from "react";
import { Boxes, Factory, GitBranch, Globe2, LoaderCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/core/i18n";
import {
  PLANETS,
  allCommodities,
  type PlanetType,
  type Tier,
} from "../data/commodities";
import { planChain } from "../lib/chain";
import { jitaSell } from "../lib/prices";
import { fmtIsk, fmtNum } from "../lib/format";
import { commodity } from "../data/commodities";
import { toast } from "@/core/toast";
import { Field, Kpi, numField } from "./bits";

const PLANET_BY_ID = new Map(PLANETS.map((p) => [p.id, p]));

/** Marchandises productibles (P1→P4), triées par palier puis nom. */
const PRODUCIBLE = allCommodities()
  .filter((c) => c.tier >= 1)
  .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

function PlanetChip({ id }: { id: PlanetType }) {
  const p = PLANET_BY_ID.get(id);
  if (!p) return null;
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
      style={{ background: `hsl(${p.accent})` }}
    >
      {p.name}
    </span>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <Badge variant="muted" className="tabular-nums">
      P{tier}
    </Badge>
  );
}

/** Mode « Chaîne » : planificateur de nomenclature pour un produit cible. */
export function ChainPlanner() {
  const t = useT();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetRate, setTargetRate] = useState(40);
  const [price, setPrice] = useState(0);
  const [pocoTaxPct, setPocoTaxPct] = useState(10);

  const plan = useMemo(
    () => (targetId ? planChain(targetId, targetRate || 0) : null),
    [targetId, targetRate],
  );

  const netIskPerHour = plan
    ? plan.targetPerHour * (price || 0) * (1 - Math.min(100, Math.max(0, pocoTaxPct || 0)) / 100)
    : 0;

  const [pxLoading, setPxLoading] = useState(false);
  async function fetchJita() {
    const name = targetId ? commodity(targetId)?.name : undefined;
    if (!name) return;
    setPxLoading(true);
    try {
      const v = await jitaSell(name);
      if (v != null) setPrice(Math.round(v));
      else toast.info(t("pi.px.none"), name);
    } catch (e) {
      toast.error(t("pi.px.error"), String(e));
    } finally {
      setPxLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* ----- Configuration ----- */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-fleur" /> {t("pi.chain.target")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Field label={t("pi.chain.target")}>
              <Select value={targetId ?? ""} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("pi.chain.pickTarget")} />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCIBLE.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      P{c.tier} · {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("pi.chain.targetRate")}>
              <Input
                type="number"
                inputMode="numeric"
                {...numField(targetRate, setTargetRate, 0)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("pi.price")}>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    inputMode="decimal"
                    {...numField(price, setPrice, 0)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 px-2"
                    onClick={fetchJita}
                    disabled={!targetId || pxLoading}
                    title={t("pi.px.fetch")}
                  >
                    {pxLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      "Jita"
                    )}
                  </Button>
                </div>
              </Field>
              <Field label={t("pi.tax")}>
                <Input
                  type="number"
                  inputMode="decimal"
                  {...numField(pocoTaxPct, setPocoTaxPct, 0)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {plan && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Globe2 className="h-4 w-4 text-fleur" /> {t("pi.chain.planets")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5 pt-0">
              {plan.planetTypes.map((p) => (
                <PlanetChip key={p} id={p} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ----- Plan ----- */}
      <div className="space-y-4">
        {plan ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi
                label={t("pi.res.netIsk")}
                value={fmtIsk(netIskPerHour)}
                accent
              />
              <Kpi
                label={t("pi.chain.totalFactories")}
                value={fmtNum(plan.totalFactories)}
              />
              <Kpi
                label={t("pi.chain.planets")}
                value={fmtNum(plan.planetTypes.length)}
              />
            </div>

            {/* Décomposition par palier */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Factory className="h-4 w-4 text-fleur" />{" "}
                  {t("pi.chain.breakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {plan.nodes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm"
                    >
                      <TierBadge tier={n.tier} />
                      <span className="flex-1 truncate">{n.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmtNum(n.perHour)} {t("pi.perHour")}
                      </span>
                      <Badge variant="outline" className="tabular-nums">
                        ×{n.factories}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Matières brutes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Boxes className="h-4 w-4 text-fleur" /> {t("pi.chain.raws")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {plan.raws.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2.5 py-1.5 text-sm"
                    >
                      <span className="min-w-36 flex-1 truncate">{r.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmtNum(r.perHour)} {t("pi.perHour")}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {r.planets.map((p) => (
                          <PlanetChip key={p} id={p} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[40vh] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("pi.chain.empty")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
