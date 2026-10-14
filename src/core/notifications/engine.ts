import { t } from "@/core/i18n";
import { notify, notifyWhenAppHidden } from "@/core/notify";
import { NOTIFICATION_EVENT_BY_TYPE } from "./catalog";
import { useNotificationCenter } from "./store";
import type {
  NotificationCondition,
  NotificationEvent,
  NotificationPayload,
  NotificationRule,
  NotificationRuleEvaluation,
  NotificationValue,
} from "./types";

const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function asNumber(value: NotificationValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateNotificationCondition(
  condition: NotificationCondition,
  current: NotificationValue,
  previous?: NotificationValue,
): boolean {
  const expected = condition.value;
  switch (condition.operator) {
    case "eq":
      return String(current) === String(expected);
    case "contains":
      return String(current ?? "").toLocaleLowerCase().includes(String(expected).toLocaleLowerCase());
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const left = asNumber(current);
      const right = asNumber(expected);
      if (left == null || right == null) return false;
      if (condition.operator === "gt") return left > right;
      if (condition.operator === "gte") return left >= right;
      if (condition.operator === "lt") return left < right;
      return left <= right;
    }
    case "crossesAbove":
    case "crossesBelow": {
      const before = asNumber(previous ?? null);
      const now = asNumber(current);
      const threshold = asNumber(expected);
      if (before == null || now == null || threshold == null) return false;
      return condition.operator === "crossesAbove"
        ? before < threshold && now >= threshold
        : before > threshold && now <= threshold;
    }
  }
}

function renderTemplate(template: string, payload: NotificationPayload): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in payload ? String(payload[key] ?? "") : `{${key}}`,
  );
}

function translationVars(payload: NotificationPayload): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === "number" || typeof value === "string" ? value : String(value ?? "")]),
  );
}

export function evaluateNotificationRule(rule: NotificationRule, event: NotificationEvent): NotificationRuleEvaluation {
  const state = useNotificationCenter.getState().ruleStates[rule.id];
  const details = rule.conditions.map((condition) => {
    const current = event.payload[condition.field] ?? null;
    const previous = state?.previousValues[condition.field];
    return { condition, current, previous, matched: evaluateNotificationCondition(
      condition,
      current,
      previous,
    ) };
  });
  return { matched: details.every((detail) => detail.matched), details };
}

function rememberValues(rule: NotificationRule, event: NotificationEvent, triggeredAt?: number, dedupeKey?: string) {
  const store = useNotificationCenter.getState();
  const previous = store.ruleStates[rule.id];
  const values = { ...(previous?.previousValues ?? {}) };
  for (const condition of rule.conditions) {
    values[condition.field] = event.payload[condition.field] ?? null;
  }
  store.setRuleState(rule.id, {
    previousValues: values,
    lastTriggeredAt: triggeredAt ?? previous?.lastTriggeredAt,
    lastDedupeKey: dedupeKey ?? previous?.lastDedupeKey,
  });
}

/** Publie un événement métier et évalue toutes les règles correspondantes. */
export async function emitNotificationEvent(event: NotificationEvent): Promise<number> {
  const definition = NOTIFICATION_EVENT_BY_TYPE.get(event.type);
  if (!definition) return 0;
  const now = event.occurredAt ?? Date.now();
  useNotificationCenter.getState().rememberEvent({ ...event, occurredAt: now });
  const rules = useNotificationCenter
    .getState()
    .rules.filter((rule) => rule.enabled && rule.eventType === event.type);
  let triggered = 0;

  for (const rule of rules) {
    const store = useNotificationCenter.getState();
    const state = store.ruleStates[rule.id];
    const evaluation = evaluateNotificationRule(rule, event);
    const cooldownMs = Math.max(0, rule.cooldownMinutes) * 60_000;
    const coolingDown =
      state?.lastTriggeredAt != null && now - state.lastTriggeredAt < cooldownMs;
    const duplicate = event.dedupeKey != null && state?.lastDedupeKey === event.dedupeKey;

    if (!evaluation.matched || coolingDown || duplicate) {
      rememberValues(rule, event);
      continue;
    }

    const title = rule.titleTemplate
      ? renderTemplate(rule.titleTemplate, event.payload)
      : t(definition.titleKey, translationVars(event.payload));
    const body = rule.bodyTemplate
      ? renderTemplate(rule.bodyTemplate, event.payload)
      : t(definition.bodyKey, translationVars(event.payload));
    const delivery = rule.onlyWhenHidden
      ? await notifyWhenAppHidden(title, body)
      : await notify(title, body);

    rememberValues(rule, event, now, event.dedupeKey);
    store.addHistory({
      id: id(),
      ruleId: rule.id,
      ruleName: rule.name,
      eventType: event.type,
      title,
      body,
      occurredAt: now,
      delivery,
      unread: delivery === "sent",
      contextTabId: event.contextTabId ?? definition.contextTabId,
      payload: { ...event.payload },
      matchedConditions: evaluation.details.map((detail) => detail.condition.field),
      dedupeKey: event.dedupeKey,
    });
    triggered += 1;
  }

  return triggered;
}
