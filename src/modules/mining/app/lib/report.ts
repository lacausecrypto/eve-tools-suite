import type { Member, PlayerGroup, Session } from "@mining/types";
import { BELT_TYPE_LABEL } from "@mining/data/ores";
import { SESSION_EVENTS } from "@mining/data/events";
import {
  consumablesSummary,
  iskShares,
  minedSummary,
  oreBreakdown,
  effectivePayoutBasis,
  refineSummary,
  sessionDurationMs,
  sessionPayout,
  stockLedger,
  totalBelts,
} from "@mining/lib/domain";
import { consumableShortLabel } from "@mining/data/consumables";
import {
  formatDateTime,
  formatDuration,
  formatIsk,
  formatIskFull,
} from "@mining/lib/format";

const fmtQty = (n: number) => Math.round(n).toLocaleString("fr-FR");

/** Traducteur injecté depuis la couche composant (garde ce lib i18n-free). */
type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Génère le contenu Markdown du rapport de fin de session. */
export function buildReportMarkdown(
  s: Session,
  members: Member[] = [],
  groups: PlayerGroup[] = [],
  t: Translate
): string {
  const end = s.endedAt ?? Date.now();
  const duration = sessionDurationMs(s, end);
  const shares = iskShares(s, end).sort((a, b) => b.isk - a.isk);
  const ores = oreBreakdown(s);
  const belts = totalBelts(s);

  const mined = minedSummary(s);
  const hasLoot = (s.lootEvents?.length ?? 0) > 0;
  const baseRepartition = t("mining.md.basis." + effectivePayoutBasis(s));

  const beltLabel = (bt: keyof typeof BELT_TYPE_LABEL) =>
    t("mining.beltType." + bt);

  const lines: string[] = [];

  lines.push(`# ${t("mining.md.title", { name: s.name })}`);
  lines.push("");
  lines.push(`> ${t("mining.md.generatedOn", { date: formatDateTime(end) })}`);
  lines.push("");
  lines.push(`## ${t("mining.md.summary")}`);
  lines.push("");
  lines.push(
    `- **${t("mining.md.beltTypes")}** : ${
      s.types.map((bt) => beltLabel(bt)).join(", ") || "—"
    }`
  );
  lines.push(`- **${t("mining.md.start")}** : ${formatDateTime(s.startedAt)}`);
  lines.push(
    `- **${t("mining.md.end")}** : ${
      s.endedAt ? formatDateTime(s.endedAt) : t("mining.md.ongoing")
    }`
  );
  lines.push(`- **${t("mining.md.duration")}** : ${formatDuration(duration)}`);
  lines.push(`- **${t("mining.md.participants")}** : ${s.members.length}`);
  if (belts > 0) lines.push(`- **${t("mining.md.beltsCounted")}** : ${belts}`);
  lines.push(`- **${t("mining.md.basis")}** : ${baseRepartition}`);
  if (hasLoot) {
    lines.push(
      `- **${t("mining.md.oreMinedTotal")}** : ${fmtQty(mined.totalQty)} ${t(
        "mining.md.units"
      )}`
    );
    lines.push(
      `- **${t("mining.md.valuation")}** : ${
        (s.valuationForm ?? "compressed") === "compressed"
          ? t("mining.md.compressedOre")
          : t("mining.md.rawOre")
      } ${t("mining.md.jitaBuy")}`
    );
    lines.push(
      `- **${t("mining.md.estValue")}** : ${formatIskFull(mined.totalValue)}`
    );
    if ((s.buybackPct ?? 100) !== 100) {
      lines.push(`- **${t("mining.md.buybackRate")}** : ${s.buybackPct} %`);
    }
  } else {
    lines.push(`- **${t("mining.md.totalIsk")}** : ${formatIskFull(s.totalIsk)}`);
  }
  lines.push("");

  // ── Composition de flotte (barges) ──
  const withBarge = s.members.filter((m) => m.barge);
  if (withBarge.length > 0) {
    const counts = new Map<string, number>();
    for (const m of withBarge)
      counts.set(m.barge!, (counts.get(m.barge!) ?? 0) + 1);
    lines.push(`## ${t("mining.md.fleetComposition")}`);
    lines.push("");
    for (const [ship, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${ship} ×${n}`);
    }
    lines.push("");
  }

  // ── Paiements (groupés par joueur, parts FC & scout incluses) ──
  const payout = sessionPayout(s, members, groups);
  const payTotal = payout.reduce((a, r) => a + r.isk, 0);
  const scoutMembers = s.members.filter((m) => m.scout);
  const fcMember = s.members.find((m) => m.fc);
  if (payout.length > 0) {
    lines.push(`## ${t("mining.md.payments")}`);
    lines.push("");
    const notes = [t("mining.md.basisShort", { basis: baseRepartition })];
    if (fcMember)
      notes.push(t("mining.md.fcAt", { name: fcMember.name, pct: s.fcPct ?? 0 }));
    if (scoutMembers.length > 0)
      notes.push(
        t("mining.md.scoutsAt", { n: scoutMembers.length, pct: s.scoutPct ?? 0 })
      );
    lines.push(`> ${notes.join(" · ")}.`);
    lines.push("");
    lines.push(
      `| ${t("mining.md.col.rank")} | ${t("mining.md.col.pilot")} | ${t(
        "mining.md.col.share"
      )} | ${t("mining.md.col.toPay")} |`
    );
    lines.push("| ---: | --- | ---: | ---: |");
    payout.forEach((r, i) => {
      const tag = `${r.fc ? " 👑" : ""}${r.scout ? " 🔭" : ""}`;
      lines.push(
        `| ${i + 1} | ${r.name}${tag} | ${
          payTotal > 0 ? ((r.isk / payTotal) * 100).toFixed(1) : "0"
        } % | ${formatIskFull(r.isk)} |`
      );
    });
    lines.push(`| | **${t("mining.md.total")}** | | **${formatIskFull(payTotal)}** |`);
    lines.push("");
  }

  if (fcMember) {
    lines.push(`## ${t("mining.md.fleetCommander")}`);
    lines.push("");
    lines.push(
      `- 👑 **${t("mining.md.fcLootShare", { name: fcMember.name, pct: s.fcPct ?? 0 })}`
    );
    lines.push("");
  }

  if (scoutMembers.length > 0) {
    lines.push(`## ${t("mining.md.scouts")}`);
    lines.push("");
    lines.push(`> ${t("mining.md.scoutNote", { pct: s.scoutPct ?? 0 })}`);
    lines.push("");
    for (const m of scoutMembers) {
      lines.push(`- 🔭 ${m.name}`);
    }
    lines.push("");
  }

  // ── Détail du minerai miné ──
  if (hasLoot) {
    lines.push(`### ${t("mining.md.oreDetailByPilot")}`);
    lines.push("");
    for (const m of mined.miners) {
      const parts = m.byOre
        .map((o) => `${o.ore} ${fmtQty(o.qty)}`)
        .join(" · ");
      lines.push(`- **${m.miner}** — ${parts}`);
    }
    lines.push("");

    lines.push(`### ${t("mining.md.oreTotalByCatGrade")}`);
    lines.push("");
    lines.push(
      `| ${t("mining.md.col.category")} | ${t("mining.md.col.ore")} | ${t(
        "mining.md.col.qty"
      )} | ${t("mining.md.col.unitPrice")} | ${t("mining.md.col.value")} |`
    );
    lines.push("| --- | --- | ---: | ---: | ---: |");
    for (const g of mined.oreGroups) {
      g.ores.forEach((o, i) => {
        lines.push(
          `| ${i === 0 ? t("mining.cat." + g.category) : ""} | ${o.ore} | ${fmtQty(o.qty)} | ${
            o.price ? `${formatIsk(o.price)} ISK` : "—"
          } | ${formatIskFull(o.value)} |`
        );
      });
    }
    lines.push(
      `| **${t("mining.md.total")}** | | **${fmtQty(mined.totalQty)}** | | **${formatIskFull(
        mined.totalValue
      )}** |`
    );
    lines.push("");
  }

  // ── Consommables : cristaux de minage (hors valorisation minerai) ──
  const consumables = consumablesSummary(s);
  if (consumables.hasAny) {
    lines.push(`## ${t("mining.md.consTitle")}`);
    lines.push("");
    lines.push(`> ${t("mining.md.consNote")}`);
    lines.push("");
    lines.push(`### ${t("mining.md.costByPilot")}`);
    lines.push("");
    lines.push(
      `| ${t("mining.md.col.pilot")} | ${t("mining.md.col.qty")} | ${t(
        "mining.md.col.estCost"
      )} | ${t("mining.md.col.share")} |`
    );
    lines.push("| --- | ---: | ---: | ---: |");
    for (const m of consumables.miners) {
      lines.push(
        `| ${m.miner} | ${fmtQty(m.totalQty)} | ${formatIskFull(
          m.value
        )} | ${m.pct.toFixed(1)} % |`
      );
    }
    lines.push(
      `| **${t("mining.md.total")}** | **${fmtQty(consumables.totalQty)}** | **${formatIskFull(
        consumables.totalValue
      )}** | |`
    );
    lines.push("");
    lines.push(`### ${t("mining.md.crystalDetail")}`);
    lines.push("");
    lines.push(
      `| ${t("mining.md.col.crystal")} | ${t("mining.md.col.qty")} | ${t(
        "mining.md.col.unitPrice"
      )} | ${t("mining.md.col.cost")} | ${t("mining.md.col.byPilot")} |`
    );
    lines.push("| --- | ---: | ---: | ---: | --- |");
    for (const it of consumables.items) {
      const repartition = it.byMiner
        .map((b) => `${b.miner} ${b.pct.toFixed(0)} % (${fmtQty(b.qty)})`)
        .join(" · ");
      lines.push(
        `| ${consumableShortLabel(it.name)} | ${fmtQty(it.totalQty)} | ${
          it.price ? `${formatIsk(it.price)} ISK` : "—"
        } | ${formatIskFull(it.value)} | ${repartition} |`
      );
    }
    lines.push("");
  }

  // ── Présence & barges par membre (informatif) ──
  const bargeOf = new Map(s.members.map((m) => [m.memberId, m.barge]));
  const scoutOf = new Map(s.members.map((m) => [m.memberId, m.scout]));
  const fcOf = new Map(s.members.map((m) => [m.memberId, m.fc]));
  // ── Retraitement : minéraux produits ──
  const refine = refineSummary(s);
  if (refine.hasAny) {
    lines.push(`## ${t("mining.md.refineTitle")}`);
    lines.push("");
    lines.push(
      `> ${t("mining.md.refineNote", {
        yield:
          refine.efficiency >= 1
            ? t("mining.md.refinePerfect")
            : `${(refine.efficiency * 100).toFixed(1)} %`,
      })}`
    );
    lines.push("");
    lines.push(`| ${t("mining.md.col.mineral")} | ${t("mining.md.col.qty")} |`);
    lines.push("| --- | ---: |");
    for (const m of refine.minerals) {
      lines.push(`| ${m.name} | ${fmtQty(Math.round(m.qty))} |`);
    }
    lines.push("");
    if (refine.miners.length > 0) {
      lines.push(
        `**${t("mining.md.shareByMiner")}** : ${refine.miners
          .map((m) => `${m.miner} ${m.pct.toFixed(0)} %`)
          .join(" · ")}`
      );
      lines.push("");
    }
  }

  // ── Stock de consommables (avec mouvements +/-) ──
  const stock = stockLedger(s);
  if (stock.hasAny) {
    lines.push(`## ${t("mining.md.stockTitle")}`);
    lines.push("");
    if (stock.hasMoves) {
      lines.push(
        `| ${t("mining.md.col.consumable")} | ${t("mining.md.col.added")} | ${t(
          "mining.md.col.removed"
        )} | ${t("mining.md.col.stock")} | ${t("mining.md.col.unitPrice")} | ${t(
          "mining.md.col.value"
        )} |`
      );
      lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
      for (const it of stock.items) {
        lines.push(
          `| ${it.name} | ${it.added ? `+${fmtQty(it.added)}` : "—"} | ${
            it.removed ? `−${fmtQty(it.removed)}` : "—"
          } | ${fmtQty(it.qty)} | ${
            it.price ? `${formatIsk(it.price)} ISK` : "—"
          } | ${formatIskFull(it.value)} |`
        );
      }
      lines.push(
        `| **${t("mining.md.total")}** | **+${fmtQty(stock.totalAdded)}** | **−${fmtQty(
          stock.totalRemoved
        )}** | **${fmtQty(stock.totalQty)}** | | **${formatIskFull(
          stock.totalValue
        )}** |`
      );
    } else {
      lines.push(
        `| ${t("mining.md.col.consumable")} | ${t("mining.md.col.qty")} | ${t(
          "mining.md.col.unitPrice"
        )} | ${t("mining.md.col.value")} |`
      );
      lines.push("| --- | ---: | ---: | ---: |");
      for (const it of stock.items) {
        lines.push(
          `| ${it.name} | ${fmtQty(it.qty)} | ${
            it.price ? `${formatIsk(it.price)} ISK` : "—"
          } | ${formatIskFull(it.value)} |`
        );
      }
      lines.push(
        `| **${t("mining.md.total")}** | **${fmtQty(stock.totalQty)}** | | **${formatIskFull(
          stock.totalValue
        )}** |`
      );
    }
    lines.push("");
  }

  lines.push(`## ${t("mining.md.presenceTitle")}`);
  lines.push("");
  lines.push(
    `| ${t("mining.md.col.member")} | ${t("mining.md.col.barge")} | ${t(
      "mining.md.col.presence"
    )} |`
  );
  lines.push("| --- | --- | ---: |");
  shares.forEach((row) => {
    const tag = `${row.active ? " 🟢" : ""}${
      fcOf.get(row.memberId) ? " 👑" : ""
    }${scoutOf.get(row.memberId) ? " 🔭" : ""}`;
    lines.push(
      `| ${row.name}${tag} | ${bargeOf.get(row.memberId) ?? "—"} | ${formatDuration(
        row.activeMs
      )} |`
    );
  });
  lines.push("");

  const beltRows = Object.entries(s.beltCounts ?? {}).filter(
    ([, n]) => n > 0
  );
  if (beltRows.length > 0) {
    lines.push(`## ${t("mining.md.beltsByTypeTitle")}`);
    lines.push("");
    lines.push(`| ${t("mining.md.col.beltType")} | ${t("mining.md.col.belts")} |`);
    lines.push("| --- | ---: |");
    for (const [type, n] of beltRows) {
      lines.push(
        `| ${
          BELT_TYPE_LABEL[type as keyof typeof BELT_TYPE_LABEL]
            ? beltLabel(type as keyof typeof BELT_TYPE_LABEL)
            : type
        } | ${n} |`
      );
    }
    lines.push(`| **${t("mining.md.total")}** | **${belts}** |`);
    lines.push("");
  } else if (ores.length > 0) {
    // Compat : anciennes sessions comptées par minerai.
    lines.push(`## ${t("mining.md.oresHarvested")}`);
    lines.push("");
    lines.push(
      `| ${t("mining.md.col.ore")} | ${t("mining.md.col.category")} | ${t(
        "mining.md.col.belts"
      )} |`
    );
    lines.push("| --- | --- | ---: |");
    for (const o of ores) {
      lines.push(`| ${o.name} | ${t("mining.cat." + o.category)} | ${o.belts} |`);
    }
    lines.push(`| **${t("mining.md.total")}** | | **${belts}** |`);
    lines.push("");
  }

  const eventEntries = SESSION_EVENTS.filter(
    (e) => (s.events?.[e.key] ?? 0) > 0
  );
  if (eventEntries.length > 0) {
    lines.push(`## ${t("mining.md.eventsTitle")}`);
    lines.push("");
    for (const e of eventEntries) {
      lines.push(`- ${e.icon} ${t("mining.event." + e.key)} : ${s.events[e.key]}`);
    }
    lines.push("");
  }

  if (s.notes.trim()) {
    lines.push(`## ${t("mining.md.notesTitle")}`);
    lines.push("");
    lines.push(s.notes.trim());
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("_EVE · Mining Fleet Manager_");
  lines.push("");

  return lines.join("\n");
}

export function downloadReport(
  s: Session,
  members: Member[] = [],
  groups: PlayerGroup[] = [],
  t: Translate
): void {
  const md = buildReportMarkdown(s, members, groups, t);
  const slug = s.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date(s.endedAt ?? s.startedAt)
    .toISOString()
    .slice(0, 10);
  triggerDownload(`rapport-${slug || "session"}-${date}.md`, md, "text/markdown");
}

export function triggerDownload(
  filename: string,
  content: string,
  mime: string
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
