import { describe, expect, it } from "vitest";
import { parseProductDeepLink } from "./deepLink";

describe("parseProductDeepLink", () => {
  it("accepts a bounded tool command", () => {
    expect(parseProductDeepLink("eve-tools-suite://open?tool=appraisal")).toMatchObject({
      moduleId: "appraisal", action: "open",
    });
  });

  it("accepts a contextual market action", () => {
    expect(parseProductDeepLink("eve-tools-suite://open?tool=market&action=watch&type_id=34")).toMatchObject({
      moduleId: "market", action: "watch", typeId: 34,
    });
  });

  it.each([
    "https://example.com/?tool=market",
    "eve-tools-suite://open?tool=unknown",
    "eve-tools-suite://open?tool=appraisal&action=watch&type_id=34",
    "eve-tools-suite://open?tool=market&action=alert&type_id=-1",
    "eve-tools-suite://other?tool=market",
  ])("rejects untrusted input %s", (url) => {
    expect(parseProductDeepLink(url)).toBeNull();
  });
});
