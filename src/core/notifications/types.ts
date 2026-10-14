import type { NotificationDelivery } from "@/core/notify";

export type NotificationValue = string | number | boolean | null;
export type NotificationPayload = Record<string, NotificationValue>;

export interface NotificationEvent {
  type: string;
  payload: NotificationPayload;
  occurredAt?: number;
  contextTabId?: string;
  /** Identité métier stable (killmail, cotation, résultat) pour éviter les doublons. */
  dedupeKey?: string;
}

export type ConditionOperator =
  | "eq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "crossesAbove"
  | "crossesBelow";

export interface NotificationCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  eventType: string;
  conditions: NotificationCondition[];
  cooldownMinutes: number;
  onlyWhenHidden: boolean;
  titleTemplate?: string;
  bodyTemplate?: string;
  createdAt: number;
}

export interface NotificationRuleState {
  lastTriggeredAt?: number;
  previousValues: Record<string, NotificationValue>;
  lastDedupeKey?: string;
}

export interface NotificationHistoryItem {
  id: string;
  ruleId: string;
  ruleName: string;
  eventType: string;
  title: string;
  body?: string;
  occurredAt: number;
  delivery: NotificationDelivery;
  unread: boolean;
  contextTabId?: string;
  payload: NotificationPayload;
  matchedConditions: string[];
  dedupeKey?: string;
}

export interface NotificationRuleEvaluation {
  matched: boolean;
  details: Array<{ condition: NotificationCondition; current: NotificationValue; previous?: NotificationValue; matched: boolean }>;
}

export interface NotificationFieldDefinition {
  key: string;
  labelKey: string;
  kind: "number" | "string" | "boolean";
}

export interface NotificationEventDefinition {
  type: string;
  moduleId: string;
  labelKey: string;
  titleKey: string;
  bodyKey: string;
  contextTabId: string;
  fields: NotificationFieldDefinition[];
}

export interface NotificationTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  rule: Omit<NotificationRule, "id" | "createdAt" | "name">;
}
