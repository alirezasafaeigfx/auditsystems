import { describe, expect, it } from "vitest";
import { qualificationCopy } from "./qualification-copy";

describe("qualificationCopy", () => {
  it("keeps the English form, errors, and success route in English", () => {
    const copy = qualificationCopy("en");

    expect(copy.formLabel).toBe("Request an Audit assessment");
    expect(copy.errors.RATE_LIMITED).toMatch(/requests/i);
    expect(copy.successTitle).toBe("Assessment request received");
    expect(copy.retry).toBe("Try again");
    expect(copy.homeHref).toBe("/en");
    expect(copy.sampleHref).toBe("/en/sample-report");
  });

  it("preserves the Persian route and recovery copy", () => {
    const copy = qualificationCopy("fa");

    expect(copy.formLabel).toContain("درخواست ارزیابی");
    expect(copy.errors.NETWORK_ERROR).toContain("اطلاعات شما حفظ شده");
    expect(copy.retry).toBe("تلاش دوباره");
    expect(copy.homeHref).toBe("/");
    expect(copy.sampleHref).toBe("/sample-report");
  });
});
