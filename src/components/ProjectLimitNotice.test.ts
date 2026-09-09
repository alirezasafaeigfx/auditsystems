import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectLimitNotice } from "./ProjectLimitNotice";

describe("ProjectLimitNotice", () => {
  it("renders an accessible Persian upgrade notice with usage and billing link", () => {
    const html = renderToStaticMarkup(createElement(ProjectLimitNotice, {
      current: 3,
      limit: 1,
      upgradeUrl: "/app/billing",
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain("3 / 1");
    expect(html).toContain('href="/app/billing"');
    expect(html).toContain("اشتراک خود را ارتقا دهید");
  });

  it("uses defined adaptive color tokens for the warning treatment", () => {
    const html = renderToStaticMarkup(createElement(ProjectLimitNotice, {
      current: 3,
      limit: 3,
      upgradeUrl: "/app/billing",
    }));

    expect(html).toContain("color:var(--text)");
    expect(html).toContain("background:color-mix(in srgb, var(--warn) 12%, var(--surface))");
    expect(html).toContain("border:1px solid color-mix(in srgb, var(--warn) 35%, var(--line))");
    expect(html).not.toContain("--warn-bg");
    expect(html).not.toContain("--warn-border");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
