import { describe, it, expect } from "vitest";
import { buildActionPlan, QUADRANT_LABELS } from "./action-plan";

describe("action-plan", () => {
  it("filters out INFO findings", () => {
    const plan = buildActionPlan([
      { code: "A", title: "Test", severity: "INFO", category: "SEO", recommendation: "Do X" },
      { code: "B", title: "Test2", severity: "HIGH", category: "SEO", recommendation: "Do Y" },
    ]);
    expect(plan.length).toBe(1);
    expect(plan[0].code).toBe("B");
  });

  it("sorts by quadrant then severity", () => {
    const plan = buildActionPlan([
      { code: "A", title: "Low", severity: "LOW", category: "SEO", recommendation: "Do X" },
      { code: "B", title: "Critical", severity: "CRITICAL", category: "SEO", recommendation: "Do Y" },
      { code: "C", title: "High", severity: "HIGH", category: "SEO", recommendation: "Do Z" },
    ]);
    expect(plan[0].severity).toBe("CRITICAL");
  });

  it("assigns correct quadrants", () => {
    const plan = buildActionPlan([
      { code: "A", title: "Critical", severity: "CRITICAL", category: "SEO", recommendation: "Do X" },
      { code: "B", title: "Low", severity: "LOW", category: "SEO", recommendation: "Do Y" },
    ]);
    const critical = plan.find((p) => p.code === "A");
    const low = plan.find((p) => p.code === "B");
    expect(critical?.quadrant).toBe("MAJOR_PROJECT");
    expect(low?.quadrant).toBe("FILL_IN");
  });

  it("has quadrant labels", () => {
    expect(QUADRANT_LABELS.QUICK_WIN).toBeTruthy();
    expect(QUADRANT_LABELS.MAJOR_PROJECT).toBeTruthy();
    expect(QUADRANT_LABELS.FILL_IN).toBeTruthy();
    expect(QUADRANT_LABELS.THANKLESS).toBeTruthy();
  });
});
