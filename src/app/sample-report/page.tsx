import type { Metadata } from "next";
import SampleReportPage from "../../components/sample-report/SampleReportPage";
import { getSampleReportCopy } from "../../lib/sample-report/copy";
import { buildPageMetadata } from "../../lib/seoMeta";

const copy = getSampleReportCopy("fa");

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/sample-report",
  title: copy.metaTitle,
  description: copy.metaDescription,
  keywords: ["گزارش نمونه", "audit report sample", "ممیزی سایت", "سئو", "امنیت"],
});

export default function SampleReportRoute() {
  return <SampleReportPage locale="fa" />;
}