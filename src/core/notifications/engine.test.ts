import { beforeEach, describe, expect, it, vi } from "vitest";

const delivery = vi.hoisted(() => ({ notify: vi.fn(), hidden: vi.fn() }));
vi.mock("@/core/notify", () => ({
  notify: delivery.notify,
  notifyWhenAppHidden: delivery.hidden,
}));

import { emitNotificationEvent, evaluateNotificationCondition } from "./engine";
import { useNotificationCenter } from "./store";
import type { NotificationRule } from "./types";

const rule = (patch: Partial<NotificationRule> = {}): NotificationRule => ({
  id: "rule-1",
  name: "Threshold",
  enabled: true,
  eventType: "market.quote.updated",
  conditions: [{ field: "avgSell", operator: "gte", value: 100 }],
  cooldownMinutes: 0,
  onlyWhenHidden: false,
  titleTemplate: "Price {item}",
  bodyTemplate: "{avgSell}",
  createdAt: 1,
  ...patch,
});

beforeEach(() => {
  delivery.notify.mockReset().mockResolvedValue("sent");
  delivery.hidden.mockReset().mockResolvedValue("sent");
  useNotificationCenter.setState({ rules: [], ruleStates: {}, history: [] });
});

describe("notification rule engine", () => {
  it("évalue les comparaisons numériques et textuelles", () => {
    expect(evaluateNotificationCondition({ field: "x", operator: "gte", value: 10 }, 12)).toBe(true);
    expect(evaluateNotificationCondition({ field: "x", operator: "contains", value: "jit" }, "Jita IV")).toBe(true);
  });

  it("ne déclenche un franchissement qu'après une valeur précédente", async () => {
    useNotificationCenter.setState({ rules: [rule({ conditions: [{ field: "avgSell", operator: "crossesBelow", value: 100 }] })] });
    await emitNotificationEvent({ type: "market.quote.updated", payload: { item: "Tritanium", avgSell: 120 } });
    expect(delivery.notify).not.toHaveBeenCalled();
    await emitNotificationEvent({ type: "market.quote.updated", payload: { item: "Tritanium", avgSell: 90 } });
    expect(delivery.notify).toHaveBeenCalledOnce();
  });

  it("applique toutes les conditions, le cooldown et écrit l'historique", async () => {
    useNotificationCenter.setState({ rules: [rule({ cooldownMinutes: 10, conditions: [
      { field: "avgSell", operator: "gte", value: 100 },
      { field: "item", operator: "contains", value: "trit" },
    ] })] });
    const event = { type: "market.quote.updated", occurredAt: 1_000, payload: { item: "Tritanium", avgSell: 150 } };
    expect(await emitNotificationEvent(event)).toBe(1);
    expect(await emitNotificationEvent({ ...event, occurredAt: 2_000 })).toBe(0);
    expect(delivery.notify).toHaveBeenCalledOnce();
    expect(useNotificationCenter.getState().history).toMatchObject([
      { title: "Price Tritanium", body: "150", unread: true, delivery: "sent" },
    ]);
  });

  it("respecte le mode seulement lorsque l'app est masquée", async () => {
    useNotificationCenter.setState({ rules: [rule({ onlyWhenHidden: true })] });
    await emitNotificationEvent({ type: "market.quote.updated", payload: { item: "Pyerite", avgSell: 100 } });
    expect(delivery.hidden).toHaveBeenCalledOnce();
    expect(delivery.notify).not.toHaveBeenCalled();
  });

  it("déduplique un même événement métier même après le cooldown", async () => {
    useNotificationCenter.setState({ rules: [rule()] });
    const event = { type: "market.quote.updated", dedupeKey: "trit:jita:100", payload: { item: "Tritanium", avgSell: 100 } };
    expect(await emitNotificationEvent({ ...event, occurredAt: 1_000 })).toBe(1);
    expect(await emitNotificationEvent({ ...event, occurredAt: 999_999 })).toBe(0);
    expect(delivery.notify).toHaveBeenCalledOnce();
  });

  it("conserve le dernier événement pour l'aperçu du constructeur", async () => {
    await emitNotificationEvent({ type: "market.quote.updated", payload: { item: "Mexallon", avgSell: 88 } });
    expect(useNotificationCenter.getState().lastEvents["market.quote.updated"]?.payload.item).toBe("Mexallon");
  });
});
