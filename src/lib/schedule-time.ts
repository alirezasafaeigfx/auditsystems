export type AuditScheduleFrequency = "WEEKLY" | "MONTHLY";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function nextScheduledRun(input: {
  frequency: string;
  currentDueAt: Date;
  anchorAt: Date;
}): Date {
  if (input.frequency === "WEEKLY") {
    return new Date(input.currentDueAt.getTime() + WEEK_MS);
  }

  if (input.frequency !== "MONTHLY") {
    throw new Error("INVALID_SCHEDULE_FREQUENCY");
  }

  const targetMonthIndex = input.currentDueAt.getUTCMonth() + 1;
  const targetYear = input.currentDueAt.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const targetDay = Math.min(
    input.anchorAt.getUTCDate(),
    daysInUtcMonth(targetYear, targetMonth),
  );

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    input.anchorAt.getUTCHours(),
    input.anchorAt.getUTCMinutes(),
    input.anchorAt.getUTCSeconds(),
    input.anchorAt.getUTCMilliseconds(),
  ));
}

export function firstScheduledRun(frequency: string, createdAt: Date = new Date()): Date {
  return nextScheduledRun({
    frequency,
    currentDueAt: createdAt,
    anchorAt: createdAt,
  });
}
