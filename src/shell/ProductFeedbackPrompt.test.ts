import { describe, expect, it, vi } from "vitest";
import { APP } from "@/core/app";
import {
  attemptFeedbackLink,
  FEEDBACK_AUTO_CLOSE_MS,
  FEEDBACK_ERROR_CLOSE_MS,
  FEEDBACK_LINKS,
  feedbackDismissDelay,
  feedbackDue,
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
