import { describe, expect, it } from "vitest";
import { feedbackDue } from "./ProductFeedbackPrompt";

describe("feedbackDue", () => {
  it("is due without a previous prompt", () => expect(feedbackDue(null, 100)).toBe(true));
  it("caps the prompt for 30 days", () => {
    const now = 40 * 24 * 60 * 60 * 1000;
    expect(feedbackDue(String(now - 29 * 24 * 60 * 60 * 1000), now)).toBe(false);
    expect(feedbackDue(String(now - 30 * 24 * 60 * 60 * 1000), now)).toBe(true);
  });
});
