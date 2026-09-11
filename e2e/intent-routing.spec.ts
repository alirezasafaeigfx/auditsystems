import { expect, test, type Locator, type Page } from "@playwright/test";

const widths = [360, 390, 768, 1440] as const;

const locales = [
  {
    name: "fa",
    home: "/",
    sample: "/sample-report",
    auditHref: "/audit",
    pricingHref: "/pricing",
    signupHref: "/signup",
    specialistHref: "/qualification",
    automatedLabel: "شروع ارزیابی خودکار",
    ownReportLabel: "ارزیابی سایت خودم",
    pricingLabel: "مشاهده قیمت‌ها",
    signupLabel: "ساخت حساب",
    specialistLabel: "درخواست بررسی تخصصی",
    implementationLabel: "درخواست همکاری برای اجرا",
    implementationPath: "/qualification",
    coverageText: "پوشش",
  },
  {
    name: "en",
    home: "/en",
    sample: "/en/sample-report",
    auditHref: "/en/audit",
    pricingHref: "/en/pricing",
    // Signup currently has no /en route. AU-04 keeps the verified shared route
    // instead of manufacturing a localized 404; full signup localization is separate work.
    signupHref: "/signup",
    specialistHref: "/en/qualification",
    automatedLabel: "Start automated audit",
    ownReportLabel: "Audit my website",
    pricingLabel: "View pricing",
    signupLabel: "Create account",
    specialistLabel: "Request specialist review",
    implementationLabel: "Request implementation support",
    implementationPath: "/en/qualification",
    coverageText: "coverage",
  },
] as const;

const sensitiveQueryPattern = /(?:^|[?&])(url|token|credential|access_token|download_token|payment_token|email|phone|report_id|session)=/i;

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectKeyboardReachable(page: Page, target: Locator) {
  const href = await target.getAttribute("href");
  expect(href).toBeTruthy();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  let reached = false;
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    const activeHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    if (activeHref === href) {
      reached = true;
      break;
    }
  }
  expect(reached).toBe(true);
}

for (const locale of locales) {
  for (const width of widths) {
    test(`${locale.name} AU-04 home route ownership at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      await page.goto(locale.home);

      const automated = page.getByRole("link", { name: locale.automatedLabel, exact: true }).first();
      const implementation = page.getByRole("link", { name: locale.implementationLabel, exact: true }).first();

      await expect(automated).toHaveAttribute("href", locale.auditHref);
      await expect(implementation).toHaveAttribute(
        "href",
        new RegExp(`^https://alirezasafaeisystems\\.ir${locale.implementationPath.replaceAll("/", "\\/")}\\?`),
      );
      await expect(implementation).toHaveAttribute("rel", /noopener noreferrer/);

      const implementationHref = await implementation.getAttribute("href");
      expect(implementationHref).toBeTruthy();
      const external = new URL(implementationHref!);
      expect(external.origin).toBe("https://alirezasafaeisystems.ir");
      expect(external.pathname).toBe(locale.implementationPath);
      expect([...external.searchParams.keys()].every((key) => key.startsWith("utm_"))).toBe(true);
      expect(external.searchParams.get("utm_source")).toBe("audit");
      expect(external.searchParams.get("utm_medium")).toBe("intent_router");
      expect(external.searchParams.get("utm_campaign")).toBe("asdev_audit");
      expect(external.searchParams.get("utm_content")).toBe("implementation_enquiry");
      expect(implementationHref!).not.toMatch(sensitiveQueryPattern);

      await expect(page.getByText(locale.coverageText, { exact: false }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectKeyboardReachable(page, implementation);

      await page.screenshot({
        path: `browser-evidence/au-04/${testInfo.project.name}-${locale.name}-home-${width}.png`,
        fullPage: true,
      });

      if (testInfo.project.name.includes("mobile")) {
        await automated.tap();
      } else {
        await automated.click();
      }
      await expect(page).toHaveURL(new RegExp(`${locale.auditHref.replaceAll("/", "\\/")}(?:\\?|$)`));
    });

    test(`${locale.name} AU-04 sample CTA ownership at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      await page.goto(locale.sample);

      const expectations = [
        [locale.automatedLabel, locale.auditHref],
        [locale.ownReportLabel, locale.auditHref],
        [locale.pricingLabel, locale.pricingHref],
        [locale.signupLabel, locale.signupHref],
        [locale.specialistLabel, locale.specialistHref],
      ] as const;

      for (const [label, href] of expectations) {
        const link = page.getByRole("link", { name: label, exact: true }).first();
        await expect(link).toHaveAttribute("href", href);
        const actualHref = await link.getAttribute("href");
        expect(actualHref ?? "").not.toMatch(sensitiveQueryPattern);
      }

      for (const href of new Set(expectations.map(([, destination]) => destination))) {
        const response = await page.request.get(href);
        expect(response.status(), `${locale.name} route ${href}`).toBeLessThan(400);
      }

      const ownReport = page.getByRole("link", { name: locale.ownReportLabel, exact: true }).first();
      expect(await ownReport.getAttribute("href")).not.toContain("?");
      await expectKeyboardReachable(page, ownReport);
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        path: `browser-evidence/au-04/${testInfo.project.name}-${locale.name}-sample-${width}.png`,
        fullPage: true,
      });
    });
  }
}
