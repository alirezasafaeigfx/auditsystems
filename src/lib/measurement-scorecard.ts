export type MeasurementEvent = "audit_entry" | "enqueue_accepted" | "usable_report_ready" | "audit_error";

export type MeasurementRow = {
  date: string;
  locale: "fa" | "en";
  device: "mobile" | "desktop" | "tablet" | "unknown";
  country: string;
  event: MeasurementEvent;
  count: number;
};

const FIELDS = new Set(["date", "locale", "device", "country", "event", "count"]);
const EVENTS = new Set<MeasurementEvent>(["audit_entry", "enqueue_accepted", "usable_report_ready", "audit_error"]);
const DEVICES = new Set<MeasurementRow["device"]>(["mobile", "desktop", "tablet", "unknown"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function parseRow(value: unknown, index: number): MeasurementRow {
  if (!isRecord(value)) throw new Error(`Row ${index}: expected an object`);
  const unexpected = Object.keys(value).find((key) => !FIELDS.has(key));
  if (unexpected) throw new Error(`Row ${index}: unexpected field ${unexpected}`);
  if (!isIsoDate(value.date)) {
    throw new Error(`Row ${index}: invalid date`);
  }
  if (value.locale !== "fa" && value.locale !== "en") throw new Error(`Row ${index}: invalid locale`);
  if (typeof value.device !== "string" || !DEVICES.has(value.device as MeasurementRow["device"])) {
    throw new Error(`Row ${index}: invalid device`);
  }
  if (typeof value.country !== "string" || !/^[A-Z]{2}$/.test(value.country)) {
    throw new Error(`Row ${index}: invalid country`);
  }
  if (typeof value.event !== "string" || !EVENTS.has(value.event as MeasurementEvent)) {
    throw new Error(`Row ${index}: invalid event`);
  }
  if (!Number.isSafeInteger(value.count) || (value.count as number) < 0) {
    throw new Error(`Row ${index}: count must be a non-negative integer`);
  }
  return value as MeasurementRow;
}

export function parseMeasurementExport(json: string): MeasurementRow[] {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("Measurement export must be valid JSON");
  }
  if (!Array.isArray(value)) throw new Error("Measurement export must be an array");
  const rows = value.map(parseRow);
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.date}|${row.locale}|${row.device}|${row.country}|${row.event}`;
    if (seen.has(key)) throw new Error(`Duplicate cohort event: ${key}`);
    seen.add(key);
  }
  return rows;
}

export function buildMeasurementScorecard(rows: MeasurementRow[]) {
  const cohorts = new Map<string, {
    cohort: Pick<MeasurementRow, "date" | "locale" | "device" | "country">;
    counts: Record<MeasurementEvent, number>;
  }>();
  for (const row of rows) {
    const key = `${row.date}|${row.locale}|${row.device}|${row.country}`;
    const entry = cohorts.get(key) ?? {
      cohort: { date: row.date, locale: row.locale, device: row.device, country: row.country },
      counts: { audit_entry: 0, enqueue_accepted: 0, usable_report_ready: 0, audit_error: 0 },
    };
    entry.counts[row.event] += row.count;
    cohorts.set(key, entry);
  }
  return [...cohorts.values()].map(({ cohort, counts }) => ({
    cohort,
    counts: {
      auditEntry: counts.audit_entry,
      enqueueAccepted: counts.enqueue_accepted,
      usableReportReady: counts.usable_report_ready,
      auditError: counts.audit_error,
    },
    rates: {
      entryToEnqueue: counts.audit_entry > 0 && counts.enqueue_accepted <= counts.audit_entry
        ? counts.enqueue_accepted / counts.audit_entry
        : null,
      enqueueToUsableReport: null,
    },
    coverage: {
      entryToEnqueue: counts.audit_entry === 0
        ? "unavailable" as const
        : counts.enqueue_accepted > counts.audit_entry ? "inconsistent" as const : "available" as const,
      enqueueToUsableReport: "unjoinable" as const,
    },
  }));
}
