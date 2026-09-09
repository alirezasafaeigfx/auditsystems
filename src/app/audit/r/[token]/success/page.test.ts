import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("report success download link", () => {
  it("does not reflect a download credential or arbitrary URL into the page", async () => {
    const { default: SuccessPage } = await import("./page");
    const markup = renderToStaticMarkup(await SuccessPage({
      params: Promise.resolve({ token: "synthetic-report" }),
      searchParams: Promise.resolve({
        orderId: "synthetic-order",
        dl: "secret-download-credential",
        downloadUrl: "https://attacker.invalid/leak",
      }),
    }));

    expect(markup).not.toContain("secret-download-credential");
    expect(markup).not.toContain("attacker.invalid");
    expect(markup).toContain('/api/pdf/synthetic-report');
  });
});
