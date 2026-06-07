import { useState } from "react";
import { ChevronRight, Hammer, Loader2, Pickaxe, ShoppingBag } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buyAllCost, countBuilt, type TreeNode } from "../lib/buildtree";
import { runBuildTree } from "../lib/tree-run";
import { oreSources, oreUnitsFor } from "../lib/ore";
import { fmtInt, fmtIsk } from "../lib/format";
import { useCalc } from "../store";
import { ITEM_NAMES } from "../data/items";
import { ItemCombobox } from "./ItemCombobox";
import { Kpi, NumInput } from "./bits";

type Status = "idle" | "loading" | "error" | "done";

/** Taux de raffinage par défaut pour l'indice « build-from-ore » (structure correcte). */
const REFINE_RATE = 0.87;

export function Tree() {
  const t = useT();
  const { recipe, inputs } = useCalc();
  const [name, setName] = useState(recipe.outputName);
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState<TreeNode | null>(null);

  async function run() {
    if (!name.trim()) return;
    setStatus("loading");
    setError(null);
    try {
      const tree = await runBuildTree(name, Math.max(1, qty), {
        me: recipe.me,
        facilityMaterialBonus: recipe.facilityMaterialBonus,
        inputs,
      });
      setRoot(tree);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  const buyAll = root ? buyAllCost(root) : 0;
  const saved = root ? buyAll - root.totalCost : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">{t("ind.tree.product")}</label>
          <ItemCombobox
            value={name}
            onChange={setName}
            options={ITEM_NAMES}
            onEnter={run}
            placeholder={t("ind.calc.output.ph")}
            className="mt-1"
          />
        </div>
        <div className="w-28">
          <label className="text-xs text-muted-foreground">{t("ind.tree.qty")}</label>
          <NumInput value={qty} onChange={setQty} min={1} className="mt-1" />
        </div>
        <Button onClick={run} disabled={!name.trim() || status === "loading"}>
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
          {t("ind.tree.compute")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("ind.tree.hint")}</p>

      {status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}

      {root && status === "done" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label={t("ind.tree.optimized")} value={fmtIsk(root.totalCost)} tone="accent" />
            <Kpi label={t("ind.tree.buyAll")} value={fmtIsk(buyAll)} />
            <Kpi label={t("ind.tree.saved")} value={fmtIsk(saved)} tone={saved > 0 ? "good" : undefined} />
            <Kpi label={t("ind.tree.built")} value={String(countBuilt(root))} />
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <NodeRow node={root} depth={0} />
          </div>
          <p className="text-[11px] text-muted-foreground/70">{t("ind.tree.note")}</p>
        </>
      )}
    </div>
  );
}

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const t = useT();
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;
  const ore = node.mode !== "build" ? oreSources(node.name, 1)[0] : undefined;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 text-sm"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        {node.typeId > 0 && <img src={typeIconUrl(node.typeId, 32)} alt="" className="h-5 w-5 rounded" />}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {node.mode === "build" ? (
          <Badge variant="success" className="gap-1">
            <Hammer className="h-3 w-3" />
            {t("ind.tree.build")}
          </Badge>
        ) : (
          <Badge variant="muted" className="gap-1">
            <ShoppingBag className="h-3 w-3" />
            {t("ind.tree.buy")}
          </Badge>
        )}

        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">×{fmtInt(node.qty)}</span>
        <span className="w-24 shrink-0 text-right font-medium tabular-nums">{fmtIsk(node.totalCost)}</span>
      </div>

      {/* Indice build-from-ore (C4) pour les minéraux achetés. */}
      {ore && (
        <div
          className="flex items-center gap-1 py-0.5 text-[11px] text-muted-foreground/80"
          style={{ paddingLeft: `${depth * 16 + 22}px` }}
        >
          <Pickaxe className="h-3 w-3" />
          {t("ind.tree.ore", {
            ore: ore.ore,
            units: fmtInt(oreUnitsFor(node.qty, ore.yieldPerUnit, REFINE_RATE)),
          })}
        </div>
      )}

      {open && node.children?.map((c, i) => <NodeRow key={c.typeId + c.name + i} node={c} depth={depth + 1} />)}
    </div>
  );
}
