import { expect, test } from "@playwright/test";

const locales = [
  {
    name: "fa",
    path: "/",
    lang: "fa",
    dir: "rtl",
    hero: "سایت شما کجا نیاز به توجه دارد؟",
    form: "شروع ارزیابی خودکار سایت",
    specialist: "درخواست بررسی تخصصی",
    specialistHref: "/qualification",
  },
  {
    name: "en",
    path: "/en",
    lang: "en",
    dir: "ltr",
    hero: "See what needs attention on your website",
    form: "Start automated website audit",
    specialist: "Request specialist review",
    specialistHref: "/en/qualification",
  },
] as const;

const widths = [360, 390, 768, 1440] as const;

for (const locale of locales) {
  for (const width of widths) {
    test(`${locale.name} home is coherent at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      await page.goto(locale.path);

      await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
      await expect(page.locator("html")).toHaveAttribute("dir", locale.dir);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: locale.hero })).toBeVisible();
      await expect(page.getByRole("form", { name: locale.form })).toBeVisible();
      await expect(page.getByRole("link", { name: locale.specialist, exact: true }).first()).toHaveAttribute(
        "href",
        locale.specialistHref,
      );

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: `browser-evidence/au-03/${locale.name}-${width}.png`,
        fullPage: true,
      });
    });
  }

  test(`${locale.name} home preserves the core journey with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(locale.path);
    await expect(page.getByRole("form", { name: locale.form })).toBeVisible();
    await expect(page.getByRole("link", { name: locale.specialist, exact: true }).first()).toBeVisible();
  });
}
