import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { APP } from "@/core/app";
import {
  attemptFeedbackLink,
  FEEDBACK_AUTO_CLOSE_MS,
  FEEDBACK_ERROR_CLOSE_MS,
  FEEDBACK_LINKS,
  feedbackDismissDelay,
  feedbackDue,
  scheduleFeedbackDismiss,
} from "./ProductFeedbackPrompt";

describe("feedbackDue — 30-day cooldown", () => {
  it("is due without a previous prompt", () => expect(feedbackDue(null, 100)).toBe(true));
  it("suppresses repeated invitations for 30 days", () => {
    const now = 40 * 24 * 60 * 60 * 1000;
    expect(feedbackDue(String(now - 29 * 24 * 60 * 60 * 1000), now)).toBe(false);
    expect(feedbackDue(String(now - 30 * 24 * 60 * 60 * 1000), now)).toBe(true);
  });
  it("recovers from corrupted or future clock values", () => {
    expect(feedbackDue("not-a-number", 100)).toBe(true);
    expect(feedbackDue("500", 100)).toBe(true);
  });
});

describe("feedback popup dismissal", () => {
  it("waits for a response and closes automatically after yes or no", () => {
    expect(feedbackDismissDelay(null)).toBeNull();
    expect(feedbackDismissDelay(true)).toBe(FEEDBACK_AUTO_CLOSE_MS);
    expect(feedbackDismissDelay(false)).toBe(FEEDBACK_AUTO_CLOSE_MS);
    expect(FEEDBACK_AUTO_CLOSE_MS).toBeLessThanOrEqual(10_000);
  });
  it("allows a brief extra interval to recover from a blocked external link", () => {
    expect(feedbackDismissDelay(true, true)).toBe(FEEDBACK_ERROR_CLOSE_MS);
    expect(feedbackDismissDelay(false, true)).toBe(FEEDBACK_ERROR_CLOSE_MS);
    expect(FEEDBACK_ERROR_CLOSE_MS).toBeGreaterThan(FEEDBACK_AUTO_CLOSE_MS);
  });
});

describe("auto-dismiss timer behavior", () => {
  it("dismisses after the configured delay for either answer", () => {
    vi.useFakeTimers();
    try {
      for (const answer of [true, false]) {
        const dismiss = vi.fn();
        const cancel = scheduleFeedbackDismiss(answer, false, dismiss);
        vi.advanceTimersByTime(FEEDBACK_AUTO_CLOSE_MS - 1);
        expect(dismiss).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(dismiss).toHaveBeenCalledTimes(1);
        cancel();
      }
    } finally {
      vi.useRealTimers();
    }
  });
  it("cancels on unmount/reply reset and does not schedule before an answer", () => {
    vi.useFakeTimers();
    try {
      const dismiss = vi.fn();
      scheduleFeedbackDismiss(null, false, dismiss);
      const cancel = scheduleFeedbackDismiss(true, false, dismiss);
      cancel();
      vi.runAllTimers();
      expect(dismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("static, public destinations", () => {
  it("offers star, issue and Discord without collecting user input", () => {
    expect(FEEDBACK_LINKS.star).toBe(APP.repository);
    expect(FEEDBACK_LINKS.issue).toBe(`${APP.repository}/issues/new`);
    expect(FEEDBACK_LINKS.discord).toBe("https://discord.gg/jmPKrr28C5");
    for (const url of Object.values(FEEDBACK_LINKS)) {
      expect(new URL(url).protocol).toBe("https:");
      expect(new URL(url).search).toBe("");
    }
  });
  it("calls the native URL opener for each supported destination", async () => {
    const opener = vi.fn(async (_url: string) => {});
    for (const dest of ["star", "discord", "issue"] as const) {
      expect(await attemptFeedbackLink(dest, opener)).toBe(true);
      expect(opener).toHaveBeenLastCalledWith(FEEDBACK_LINKS[dest]);
    }
    expect(opener).toHaveBeenCalledTimes(3);
  });
  it("reports native opener failures instead of silently ignoring the click", async () => {
    const opener = vi.fn(async () => { throw new Error("opener blocked"); });
    expect(await attemptFeedbackLink("issue", opener)).toBe(false);
    expect(opener).toHaveBeenCalledWith(FEEDBACK_LINKS.issue);
  });
});

describe("Tauri native browser opener capability", () => {
  it("allows the public links used by feedback, privacy and existing zKillboard features", () => {
    const capabilities = JSON.parse(readFileSync(new URL("../../src-tauri/capabilities/default.json", import.meta.url), "utf8"));
    const opener = capabilities.permissions.find((permission: string | { identifier: string }) =>
      typeof permission !== "string" && permission.identifier === "opener:allow-open-url"
    ) as { identifier: string; allow: { url: string }[] } | undefined;
    expect(opener).toBeDefined();
    const allowed = opener?.allow.map((rule) => rule.url);
    expect(allowed).toContain(FEEDBACK_LINKS.star);
    expect(allowed).toContain(FEEDBACK_LINKS.discord);
    expect(allowed).toContain("https://github.com/lacausecrypto/eve-tools-suite/**");
    expect(allowed).toContain("https://zkillboard.com/**");
    expect(capabilities.permissions).not.toContain("opener:allow-default-urls");
  });
});
