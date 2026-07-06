import type { SampleSeverity } from "../../lib/sample-report/types";

export function severityBadgeClass(severity: SampleSeverity): string {
  if (severity === "CRITICAL") return "sev-critical";
  if (severity === "HIGH") return "sev-high";
  if (severity === "MEDIUM") return "sev-medium";
  return "";
}