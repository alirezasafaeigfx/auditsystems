import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import HomePage from "./page";
import HomePageEn from "./en/page";

function renderHomes() {
  return {
    faHtml: renderToStaticMarkup(createElement(HomePage)),
    enHtml: renderToStaticMarkup(createElement(HomePageEn)),
  };
}

describe("AU-03 home experience", () => {
  it("removes unsupported reliability, security, duration, privacy, and internal-count claims", () => {
    const { faHtml, enHtml } = renderHomes();
    const combined = `${faHtml}\n${enHtml}`;

    for (const unsupportedClaim of [
      "۹۹٪ آپتایم",
      "امنیت کامل",
      "کمتر از ۲ دقیقه",
      "بدون ذخیره اطلاعات خصوصی",
      "Stable Infrastructure",
      "22/22",
      "20+",
      "All done-phase automation checks passing",
    ]) {
      expect(combined).not.toContain(unsupportedClaim);
    }
  });

  it("keeps one automated form and a distinct localized specialist-review action in each hero", () => {
    const { faHtml, enHtml } = renderHomes();
    const fa = load(faHtml);
    const en = load(enHtml);

    expect(fa(".hero form.hero-audit-form")).toHaveLength(1);
    expect(en(".hero form.hero-audit-form")).toHaveLength(1);

    expect(fa(".hero .hero-actions a[href='/qualification']").text()).toContain("درخواست بررسی تخصصی");
    expect(en(".hero .hero-actions a[href='/en/qualification']").text()).toContain("Request specialist review");

    const faHeroHrefs = fa(".hero .hero-actions a")
      .map((_, element) => fa(element).attr("href"))
      .get();
    const enHeroHrefs = en(".hero .hero-actions a")
      .map((_, element) => en(element).attr("href"))
      .get();

    expect(new Set(faHeroHrefs).size).toBe(faHeroHrefs.length);
    expect(new Set(enHeroHrefs).size).toBe(enHeroHrefs.length);
  });

  it("renders English automated-entry copy on the English home", () => {
    const { enHtml } = renderHomes();

    expect(enHtml).toContain("Start automated website audit");
    expect(enHtml).toContain("Start automated audit");
    expect(enHtml).not.toContain("شروع ارزیابی رایگان");
  });
});
