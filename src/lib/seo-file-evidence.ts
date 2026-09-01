import { fetchAuditResource, type AuditResourceResponse } from "./safeAuditFetch";
import type { SeoFileEvidence } from "./types";

type SeoResourceFetcher = (
  url: string,
  signal: AbortSignal,
  options: { acceptedContentTypes: string[]; maxResponseBytes: number }
) => Promise<Pick<AuditResourceResponse, "status" | "body">>;

const MAX_SEO_FILE_BYTES = 256 * 1024;

async function probe(
  url: string,
  signal: AbortSignal,
  acceptedContentTypes: string[],
  fetchResource: SeoResourceFetcher
): Promise<SeoFileEvidence> {
  try {
    const response = await fetchResource(url, signal, { acceptedContentTypes, maxResponseBytes: MAX_SEO_FILE_BYTES });
    if (response.status >= 200 && response.status < 300) {
      return { url, status: "VERIFIED", httpStatus: response.status };
    }
    if (response.status === 404 || response.status === 410) {
      return { url, status: "MISSING", httpStatus: response.status };
    }
    return { url, status: "UNAVAILABLE", httpStatus: response.status, limitation: `HTTP_${response.status}` };
  } catch (error) {
    if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : error;
    return {
      url,
      status: "UNAVAILABLE",
      limitation: error instanceof Error ? error.message : "SEO_FILE_PROBE_FAILED",
    };
  }
}

export async function collectSeoFileEvidence(
  origin: string,
  signal: AbortSignal,
  fetchResource: SeoResourceFetcher = fetchAuditResource
): Promise<{ robots: SeoFileEvidence; sitemap: SeoFileEvidence }> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const sitemapUrl = new URL("/sitemap.xml", origin).toString();
  const [robots, sitemap] = await Promise.all([
    probe(robotsUrl, signal, ["text/plain"], fetchResource),
    probe(sitemapUrl, signal, ["application/xml", "text/xml", "application/rss+xml"], fetchResource),
  ]);
  return { robots, sitemap };
}
