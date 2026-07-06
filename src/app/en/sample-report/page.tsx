import type { Metadata } from "next";
import SampleReportPage from "../../../components/sample-report/SampleReportPage";
import { getSampleReportCopy } from "../../../lib/sample-report/copy";
import { buildPageMetadata } from "../../../lib/seoMeta";

const copy = getSampleReportCopy("en");

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/sample-report",
  title: copy.metaTitle,
  description: copy.metaDescription,
  keywords: ["sample audit report", "technical SEO report", "site audit", "web performance"],
});

export default function SampleReportRouteEn() {
  return <SampleReportPage locale="en" />;
}