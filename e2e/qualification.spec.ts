import { expect, test, type Page, type Route } from "@playwright/test";

const locales = [
  {
    name: "fa",
    path: "/qualification",
    form: "درخواست ارزیابی Audit",
    submit: "درخواست ارزیابی",
    submitting: "در حال ثبت...",
    retry: "تلاش دوباره",
    success: "درخواست ارزیابی دریافت شد",
    sample: "مشاهده نمونه گزارش",
    home: "بازگشت",
    sampleHref: "/sample-report",
    homeHref: "/",
  },
  {
    name: "en",
    path: "/en/qualification",
    form: "Request an Audit assessment",
    submit: "Request assessment",
    submitting: "Submitting...",
    retry: "Try again",
    success: "Assessment request received",
    sample: "View sample report",
    home: "Back to home",
    sampleHref: "/en/sample-report",
    homeHref: "/en",
  },
] as const;

async function fillForm(page: Page, formName: string) {
  const form = page.getByRole("form", { name: formName });
  await form.locator('[name="domain"]').fill("https://example.com");
  await form.locator('[name="contact"]').fill("owner@example.com");
  await form.locator('[name="name"]').fill("Test Owner");
  await form.locator('[name="phone"]').fill("09120000000");
  await form.locator('[name="company"]').fill("Example Co");
  await form.locator('[name="businessType"]').selectOption("agency");
  await form.locator('[name="primaryConcern"]').fill("Mobile pages are slow and search traffic declined.");
  await form.locator('[name="consentPrivacy"]').check();
  return form;
}

const failures: Array<{ name: string; handler: (route: Route) => Promise<void>; error: { fa: RegExp; en: RegExp } }> = [
  { name: "rejected network request", handler: (route) => route.abort("failed"), error: { fa: /ارتباط با سرور برقرار نشد/, en: /We could not reach the server/ } },
  { name: "non-JSON response", handler: (route) => route.fulfill({ status: 502, contentType: "text/plain", body: "bad gateway" }), error: { fa: /پاسخ سرور قابل بررسی نبود/, en: /The server response could not be verified/ } },
  { name: "API validation response", handler: (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "DOMAIN_REQUIRED" }) }), error: { fa: /آدرس سایت را وارد کنید/, en: /Enter your website address/ } },
  { name: "rate-limited response", handler: (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "RATE_LIMITED" }) }), error: { fa: /تعداد درخواست‌ها زیاد است/, en: /Too many requests/ } },
  { name: "server error response", handler: (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "REQUEST_FAILED" }) }), error: { fa: /ثبت درخواست با خطا روبه‌رو شد/, en: /The request could not be submitted/ } },
];

for (const locale of locales) {
  test.describe(`${locale.name} qualification`, () => {
    for (const failure of failures) {
      test(`${failure.name} preserves fields, focuses the alert, and retries only on demand`, async ({ page }) => {
        let requests = 0;
        const submitIds: string[] = [];
        await page.route("**/api/leads", async (route) => {
          requests += 1;
          submitIds.push(String(JSON.parse(route.request().postData() ?? "{}").submitEventId));
          if (requests === 1) await failure.handler(route);
          else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
        });
        await page.goto(locale.path);
        const form = await fillForm(page, locale.form);
        await form.getByRole("button", { name: locale.submit, exact: true }).click();

        const alert = form.getByRole("alert");
        await expect(alert).toHaveText(failure.error[locale.name]);
        await expect(alert).toBeFocused();
        await expect(form.locator('[name="domain"]')).toHaveValue("https://example.com");
        await expect(form.locator('[name="contact"]')).toHaveValue("owner@example.com");
        await expect(form.locator('[name="name"]')).toHaveValue("Test Owner");
        await expect(form.locator('[name="phone"]')).toHaveValue("09120000000");
        await expect(form.locator('[name="company"]')).toHaveValue("Example Co");
        await expect(form.locator('[name="businessType"]')).toHaveValue("agency");
        await expect(form.locator('[name="primaryConcern"]')).toHaveValue("Mobile pages are slow and search traffic declined.");
        await expect(form.locator('[name="consentPrivacy"]')).toBeChecked();
        await expect(form.getByRole("button", { name: locale.retry })).toBeEnabled();
        await form.locator('[name="company"]').press("End");
        await form.locator('[name="company"]').type(" Updated");
        await form.locator('[name="primaryConcern"]').focus();
        await expect.poll(() => requests, {
          intervals: [100, 250, 500],
          timeout: 1_000,
        }).toBe(1);

        await form.getByRole("button", { name: locale.retry }).click();
        await expect(page.getByRole("heading", { name: locale.success })).toBeVisible();
        expect(requests).toBe(2);
        expect(submitIds[0]).not.toBe(submitIds[1]);
      });
    }

    test("submits once by keyboard and keeps localized success links", async ({ page }) => {
      let requests = 0;
      let releaseResponse: (() => void) | undefined;
      const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
      await page.route("**/api/leads", async (route) => {
        requests += 1;
        await responseGate;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      });
      await page.goto(locale.path);
      const form = await fillForm(page, locale.form);
      await form.locator('[name="consentPrivacy"]').focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await expect(form.getByRole("button", { name: locale.submitting })).toBeDisabled();
      await expect.poll(() => requests, {
        intervals: [100, 250, 500],
        timeout: 1_000,
      }).toBe(1);
      releaseResponse?.();

      const success = page.getByRole("heading", { name: locale.success }).locator("..");
      await expect(success).toBeVisible();
      await expect(success.getByRole("link", { name: locale.sample, exact: true })).toHaveAttribute("href", locale.sampleHref);
      await expect(success.getByRole("link", { name: locale.home, exact: true })).toHaveAttribute("href", locale.homeHref);
      expect(requests).toBe(1);
    });
  });
}
