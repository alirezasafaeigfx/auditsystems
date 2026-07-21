import * as cheerio from "cheerio";
import { firstSrcsetCandidate } from "./normalizeAuditTargetUrl";
import { ExtractedResource, ResourceKind } from "./types";

type ExtractOptions = {
  baseUrl: string;
  firstPartyHosts: Set<string>;
};

function safeToAbsolute(baseUrl: string, candidate: string): string | null {
  const value = String(candidate ?? "").trim();
  if (!value || /^data:|^javascript:/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function buildResource(
  opts: ExtractOptions,
  rawUrl: string,
  kind: ResourceKind,
  tagIndex: number,
  headEnd: number,
  attrs: Record<string, string | boolean>
): ExtractedResource | null {
  const absolute = safeToAbsolute(opts.baseUrl, rawUrl);
  if (!absolute) return null;

  const host = new URL(absolute).hostname.toLowerCase();

  return {
    url: absolute,
    host,
    kind,
    isThirdParty: !opts.firstPartyHosts.has(host),
    inHead: headEnd === -1 ? undefined : tagIndex < headEnd,
    attrs
  };
}

export function extractResourcesFromHtml(html: string, opts: ExtractOptions): ExtractedResource[] {
  const resources: ExtractedResource[] = [];
  const $ = cheerio.load(html);
  const headEnd = html.toLowerCase().indexOf("</head>");

  const push = (
    rawUrl: string,
    kind: ResourceKind,
    tagIndex: number,
    attrs: Record<string, string | boolean>
  ): void => {
    const resource = buildResource(opts, rawUrl, kind, tagIndex, headEnd, attrs);
    if (resource) resources.push(resource);
  };

  // Extract scripts
  $("script").each((_i, element) => {
    const src = $(element).attr("src");
    if (src) {
      const attrs: Record<string, string | boolean> = {
        async: $(element).attr("async") !== undefined,
        defer: $(element).attr("defer") !== undefined,
        type: $(element).attr("type") ?? ""
      };
      push(src, "script", html.indexOf($.html(element)), attrs);
    }
  });

  // Extract links
  $("link").each((_i, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const rel = ($(element).attr("rel") ?? "").toLowerCase();
    const as = ($(element).attr("as") ?? "").toLowerCase();
    const tagIndex = html.indexOf($.html(element));

    if (rel.includes("stylesheet")) {
      push(href, "style", tagIndex, { rel, as });
      return;
    }

    if (rel.includes("preload")) {
      if (as === "font") push(href, "font", tagIndex, { rel, as });
      else if (as === "style") push(href, "style", tagIndex, { rel, as });
      else if (as === "script") push(href, "script", tagIndex, { rel, as });
      else push(href, "preload", tagIndex, { rel, as });
      return;
    }

    push(href, "other", tagIndex, { rel, as });
  });

  // Extract images
  $("img").each((_i, element) => {
    const src = $(element).attr("src");
    const srcset = $(element).attr("srcset");
    const loading = $(element).attr("loading") ?? "";
    const tagIndex = html.indexOf($.html(element));

    if (src) {
      push(src, "img", tagIndex, { loading });
      return;
    }

    if (srcset) {
      const candidate = firstSrcsetCandidate(srcset);
      if (candidate) push(candidate, "img", tagIndex, { srcset: "used-first-candidate" });
    }
  });

  // Extract source elements
  $("source").each((_i, element) => {
    const srcset = $(element).attr("srcset");
    if (!srcset) return;

    const candidate = firstSrcsetCandidate(srcset);
    if (!candidate) return;

    const type = $(element).attr("type") ?? "";
    const tagIndex = html.indexOf($.html(element));
    push(candidate, "img", tagIndex, { srcset: "used-first-candidate", type });
  });

  return resources;
}
