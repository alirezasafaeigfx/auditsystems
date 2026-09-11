import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroAuditForm, { buildHeroAuditDestination } from "./HeroAuditForm";

describe("HeroAuditForm", () => {
  it("renders the automated audit entry in Persian and English with an LTR URL field", () => {
    const faHtml = renderToStaticMarkup(createElement(HeroAuditForm, { locale: "fa" }));
    const enHtml = renderToStaticMarkup(createElement(HeroAuditForm, { locale: "en" }));

    expect(faHtml).toContain('aria-label="شروع ارزیابی خودکار سایت"');
    expect(faHtml).toContain("شروع ارزیابی خودکار");
    expect(faHtml).toContain("برای شروع، آدرس عمومی سایت کافی است.");

    expect(enHtml).toContain('aria-label="Start automated website audit"');
    expect(enHtml).toContain("Start automated audit");
    expect(enHtml).toContain("A public website address is enough to start.");
    expect(enHtml).not.toContain("لطفا آدرس سایت را وارد کنید");

    expect(faHtml).toContain('dir="ltr"');
    expect(enHtml).toContain('dir="ltr"');
  });

  it("keeps the automated audit destination in the selected locale", () => {
    expect(buildHeroAuditDestination("https://example.com/path", "fa")).toBe(
      "/audit?url=https%3A%2F%2Fexample.com%2Fpath"
    );
    expect(buildHeroAuditDestination("https://example.com/path", "en")).toBe(
      "/en/audit?url=https%3A%2F%2Fexample.com%2Fpath"
    );
  });
});
