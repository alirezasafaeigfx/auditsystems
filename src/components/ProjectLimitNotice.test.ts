import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectLimitNotice } from "./ProjectLimitNotice";

describe("ProjectLimitNotice", () => {
  it("renders an accessible Persian upgrade notice with usage and billing link", () => {
    const html = renderToStaticMarkup(createElement(ProjectLimitNotice, {
      current: 3,
      limit: 3,
      upgradeUrl: "/app/billing",
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain("3 / 3");
    expect(html).toContain('href="/app/billing"');
    expect(html).toContain("اشتراک خود را ارتقا دهید");
  });
});
