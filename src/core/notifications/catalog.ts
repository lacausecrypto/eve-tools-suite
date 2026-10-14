import type {
  NotificationEventDefinition,
  NotificationRule,
  NotificationTemplate,
} from "./types";

export const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  {
    type: "trade.station.completed",
    moduleId: "trade",
    labelKey: "notifications.event.tradeStation",
    titleKey: "trade.notify.scanComplete.title",
    bodyKey: "trade.notify.stationComplete.body",
    contextTabId: "m:trade",
    fields: [
      { key: "opportunityCount", labelKey: "notifications.field.opportunityCount", kind: "number" },
      { key: "totalProfit", labelKey: "notifications.field.totalProfit", kind: "number" },
      { key: "hub", labelKey: "notifications.field.hub", kind: "string" },
    ],
  },
  {
    type: "trade.arbitrage.completed",
    moduleId: "trade",
    labelKey: "notifications.event.tradeArbitrage",
    titleKey: "trade.notify.scanComplete.title",
    bodyKey: "trade.notify.arbitrageComplete.body",
    contextTabId: "m:trade",
    fields: [
      { key: "opportunityCount", labelKey: "notifications.field.opportunityCount", kind: "number" },
      { key: "bestProfit", labelKey: "notifications.field.bestProfit", kind: "number" },
      { key: "bestRoi", labelKey: "notifications.field.bestRoi", kind: "number" },
      { key: "mode", labelKey: "notifications.field.mode", kind: "string" },
    ],
  },
  {
    type: "trade.multibuy.completed",
    moduleId: "trade",
    labelKey: "notifications.event.tradeMultibuy",
    titleKey: "trade.notify.scanComplete.title",
    bodyKey: "trade.notify.multibuyComplete.body",
    contextTabId: "m:trade",
    fields: [
      { key: "lineCount", labelKey: "notifications.field.lineCount", kind: "number" },
      { key: "totalBuy", labelKey: "notifications.field.totalBuy", kind: "number" },
      { key: "totalSell", labelKey: "notifications.field.totalSell", kind: "number" },
    ],
  },
  {
    type: "trade.scan.failed",
    moduleId: "trade",
    labelKey: "notifications.event.tradeFailure",
    titleKey: "trade.notify.scanFailed.title",
    bodyKey: "trade.notify.scanFailed.body",
    contextTabId: "m:trade",
    fields: [{ key: "scan", labelKey: "notifications.field.scan", kind: "string" }],
  },
  {
    type: "market.quote.updated",
    moduleId: "market",
    labelKey: "notifications.event.marketQuote",
    titleKey: "notifications.message.market.title",
    bodyKey: "notifications.message.market.body",
    contextTabId: "m:market",
    fields: [
      { key: "item", labelKey: "notifications.field.item", kind: "string" },
      { key: "typeId", labelKey: "notifications.field.typeId", kind: "number" },
      { key: "avgSell", labelKey: "notifications.field.avgSell", kind: "number" },
      { key: "avgBuy", labelKey: "notifications.field.avgBuy", kind: "number" },
      { key: "marginPct", labelKey: "notifications.field.marginPct", kind: "number" },
      { key: "scope", labelKey: "notifications.field.scope", kind: "string" },
    ],
  },
  {
    type: "pirate.analysis.completed",
    moduleId: "pirate",
    labelKey: "notifications.event.pirateAnalysis",
    titleKey: "notifications.message.pirate.title",
    bodyKey: "notifications.message.pirate.body",
    contextTabId: "m:pirate",
    fields: [
      { key: "pilotCount", labelKey: "notifications.field.pilotCount", kind: "number" },
      { key: "dangerousCount", labelKey: "notifications.field.dangerousCount", kind: "number" },
      { key: "deadlyCount", labelKey: "notifications.field.deadlyCount", kind: "number" },
      { key: "watchlistCount", labelKey: "notifications.field.watchlistCount", kind: "number" },
    ],
  },
  {
    type: "loss.analysis.completed",
    moduleId: "loss",
    labelKey: "notifications.event.lossAnalysis",
    titleKey: "notifications.message.loss.title",
    bodyKey: "notifications.message.loss.body",
    contextTabId: "m:loss",
    fields: [
      { key: "ship", labelKey: "notifications.field.ship", kind: "string" },
      { key: "totalValue", labelKey: "notifications.field.totalValue", kind: "number" },
      { key: "attackerCount", labelKey: "notifications.field.attackerCount", kind: "number" },
      { key: "gangClass", labelKey: "notifications.field.gangClass", kind: "string" },
    ],
  },
  {
    type: "appraisal.completed", moduleId: "appraisal", labelKey: "notifications.event.appraisal",
    titleKey: "notifications.message.appraisal.title", bodyKey: "notifications.message.appraisal.body", contextTabId: "m:appraisal",
    fields: [
      { key: "lineCount", labelKey: "notifications.field.lineCount", kind: "number" },
      { key: "totalBuy", labelKey: "notifications.field.totalBuy", kind: "number" },
      { key: "totalSell", labelKey: "notifications.field.totalSell", kind: "number" },
      { key: "hub", labelKey: "notifications.field.hub", kind: "string" },
    ],
  },
  {
    type: "industry.calculation.completed", moduleId: "industry", labelKey: "notifications.event.industry",
    titleKey: "notifications.message.industry.title", bodyKey: "notifications.message.industry.body", contextTabId: "m:industry",
    fields: [
      { key: "item", labelKey: "notifications.field.item", kind: "string" },
      { key: "profit", labelKey: "notifications.field.profit", kind: "number" },
      { key: "marginPct", labelKey: "notifications.field.marginPct", kind: "number" },
      { key: "profitPerHour", labelKey: "notifications.field.profitPerHour", kind: "number" },
    ],
  },
  {
    type: "skills.queue.imported", moduleId: "skills", labelKey: "notifications.event.skills",
    titleKey: "notifications.message.skills.title", bodyKey: "notifications.message.skills.body", contextTabId: "m:skills",
    fields: [
      { key: "character", labelKey: "notifications.field.character", kind: "string" },
      { key: "skillCount", labelKey: "notifications.field.skillCount", kind: "number" },
    ],
  },
  {
    type: "lp.store.completed", moduleId: "lp", labelKey: "notifications.event.lp",
    titleKey: "notifications.message.lp.title", bodyKey: "notifications.message.lp.body", contextTabId: "m:lp",
    fields: [
      { key: "offerCount", labelKey: "notifications.field.offerCount", kind: "number" },
      { key: "bestIskPerLp", labelKey: "notifications.field.bestIskPerLp", kind: "number" },
      { key: "bestOffer", labelKey: "notifications.field.bestOffer", kind: "string" },
    ],
  },
  {
    type: "abyssal.evaluation.completed", moduleId: "abyssal", labelKey: "notifications.event.abyssal",
    titleKey: "notifications.message.abyssal.title", bodyKey: "notifications.message.abyssal.body", contextTabId: "m:abyssal",
    fields: [
      { key: "item", labelKey: "notifications.field.item", kind: "string" },
      { key: "qualityPct", labelKey: "notifications.field.qualityPct", kind: "number" },
      { key: "estimatedValue", labelKey: "notifications.field.estimatedValue", kind: "number" },
    ],
  },
  {
    type: "refine.calculation.completed", moduleId: "refine", labelKey: "notifications.event.refine",
    titleKey: "notifications.message.refine.title", bodyKey: "notifications.message.refine.body", contextTabId: "m:refine",
    fields: [
      { key: "rawValue", labelKey: "notifications.field.rawValue", kind: "number" },
      { key: "refinedValue", labelKey: "notifications.field.refinedValue", kind: "number" },
      { key: "gain", labelKey: "notifications.field.gain", kind: "number" },
      { key: "rate", labelKey: "notifications.field.rate", kind: "number" },
    ],
  },
];

export const NOTIFICATION_EVENT_BY_TYPE = new Map(
  NOTIFICATION_EVENTS.map((event) => [event.type, event]),
);

const baseRule = (
  eventType: string,
): Omit<NotificationRule, "id" | "createdAt" | "name"> => ({
  enabled: true,
  eventType,
  conditions: [],
  cooldownMinutes: 5,
  onlyWhenHidden: true,
});

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "trade-station-finished",
    nameKey: "notifications.template.station.name",
    descriptionKey: "notifications.template.station.desc",
    rule: baseRule("trade.station.completed"),
  },
  {
    id: "trade-arbitrage-profitable",
    nameKey: "notifications.template.arbitrage.name",
    descriptionKey: "notifications.template.arbitrage.desc",
    rule: {
      ...baseRule("trade.arbitrage.completed"),
      conditions: [{ field: "bestProfit", operator: "gte", value: 50_000_000 }],
      cooldownMinutes: 15,
    },
  },
  {
    id: "market-price-crosses-below",
    nameKey: "notifications.template.market.name",
    descriptionKey: "notifications.template.market.desc",
    rule: {
      ...baseRule("market.quote.updated"),
      conditions: [{ field: "avgSell", operator: "crossesBelow", value: 100_000 }],
      cooldownMinutes: 30,
    },
  },
  {
    id: "pirate-danger",
    nameKey: "notifications.template.pirate.name",
    descriptionKey: "notifications.template.pirate.desc",
    rule: {
      ...baseRule("pirate.analysis.completed"),
      conditions: [{ field: "dangerousCount", operator: "gte", value: 1 }],
      cooldownMinutes: 2,
      onlyWhenHidden: false,
    },
  },
  {
    id: "loss-high-value",
    nameKey: "notifications.template.loss.name",
    descriptionKey: "notifications.template.loss.desc",
    rule: {
      ...baseRule("loss.analysis.completed"),
      conditions: [{ field: "totalValue", operator: "gte", value: 1_000_000_000 }],
      cooldownMinutes: 5,
    },
  },
];

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: "default-trade-station",
    name: "Trade · Station scan complete",
    createdAt: 1,
    ...baseRule("trade.station.completed"),
  },
  {
    id: "default-trade-arbitrage",
    name: "Trade · Arbitrage scan complete",
    createdAt: 2,
    ...baseRule("trade.arbitrage.completed"),
  },
  {
    id: "default-trade-multibuy",
    name: "Trade · Multibuy complete",
    createdAt: 3,
    ...baseRule("trade.multibuy.completed"),
  },
  {
    id: "default-trade-failure",
    name: "Trade · Scan failed",
    createdAt: 4,
    ...baseRule("trade.scan.failed"),
    cooldownMinutes: 1,
  },
];
