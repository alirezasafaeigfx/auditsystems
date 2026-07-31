import { describe, expect, it } from "vitest";
import { firstScheduledRun, nextScheduledRun } from "./schedule-time";

describe("schedule recurrence", () => {
  it("preserves weekly UTC time", () => {
    const due = new Date("2026-07-30T14:35:20.000Z");
    expect(nextScheduledRun({ frequency: "WEEKLY", currentDueAt: due, anchorAt: due }).toISOString())
      .toBe("2026-08-06T14:35:20.000Z");
  });

  it("clamps January 31 to February and restores the anchor day in March", () => {
    const anchor = new Date("2026-01-31T08:15:00.000Z");
    const february = nextScheduledRun({ frequency: "MONTHLY", currentDueAt: anchor, anchorAt: anchor });
    const march = nextScheduledRun({ frequency: "MONTHLY", currentDueAt: february, anchorAt: anchor });

    expect(february.toISOString()).toBe("2026-02-28T08:15:00.000Z");
    expect(march.toISOString()).toBe("2026-03-31T08:15:00.000Z");
  });

  it("uses February 29 in a leap year", () => {
    const anchor = new Date("2028-01-31T12:00:00.000Z");
    expect(nextScheduledRun({ frequency: "MONTHLY", currentDueAt: anchor, anchorAt: anchor }).toISOString())
      .toBe("2028-02-29T12:00:00.000Z");
  });

  it("calculates the first run from the creation anchor", () => {
    const createdAt = new Date("2026-08-31T23:59:59.000Z");
    expect(firstScheduledRun("MONTHLY", createdAt).toISOString())
      .toBe("2026-09-30T23:59:59.000Z");
  });

  it("rejects unsupported frequency values", () => {
    expect(() => firstScheduledRun("DAILY", new Date("2026-07-30T00:00:00Z")))
      .toThrow("INVALID_SCHEDULE_FREQUENCY");
  });
});
