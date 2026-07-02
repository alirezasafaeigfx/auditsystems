import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { getGuides } from "../content/guides";

type CheckOutcome = "passed" | "failed";

type CheckResult = {
  id: string;
  title: string;
  outcome: CheckOutcome;
  detail: string;
};

type Summary = {
  generatedAt: string;
  strict: boolean;
  checks: CheckResult[];
  passed: number;
  failed: number;
};

const repoRoot = process.cwd();
const srcAppDir = path.join(repoRoot, "src", "app");
const logsDir = path.join(repoRoot, "logs", "seo");

function hasMetadataDefinition(content: string): boolean {
  return /export\s+const\s+metadata\s*:/.test(content) || /export\s+async\s+function\s+generateMetadata/.test(content);
}

function isTokenRouteFile(filePath: string): boolean {
  return filePath.includes(`${path.sep}audit${path.sep}r${path.sep}[token]${path.sep}`);
}

function isFailedPageFile(filePath: string): boolean {
  return filePath.endsWith(`${path.sep}failed${path.sep}page.tsx`);
}

function isIndexablePageFile(filePath: string): boolean {
  if (!filePath.endsWith(`${path.sep}page.tsx`)) return false;
  if (isTokenRouteFile(filePath)) return false;
  if (isFailedPageFile(filePath)) return false;
  return true;
}

async function collectFiles(dir: string, matcher: (entryPath: string) => boolean): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(fullPath, matcher)));
      continue;
    }
    if (matcher(fullPath)) {
      result.push(fullPath);
    }
  }

  return result;
}

function toRouteFromPageFile(filePath: string): string {
  const rel = path.relative(srcAppDir, filePath).replace(/\\/g, "/");
  const route = rel.replace(/\/page\.tsx$/, "");
  return route.length === 0 ? "/" : `/${route}`;
}

function addCheck(checks: CheckResult[], id: string, title: string, ok: boolean, detail: string) {
  checks.push({ id, title, outcome: ok ? "passed" : "failed", detail });
}

function toMarkdown(summary: Summary): string {
  const lines: string[] = [];
  lines.push("# SEO Automation Report");
  lines.push("");
  lines.push(`- Generated At: ${summary.generatedAt}`);
  lines.push(`- Strict Mode: ${summary.strict ? "true" : "false"}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  for (const check of summary.checks) {
    const icon = check.outcome === "passed" ? "PASS" : "FAIL";
    lines.push(`- [${icon}] ${check.id} — ${check.title}`);
    lines.push(`  - ${check.detail}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  const checks: CheckResult[] = [];

  const pageFiles = await collectFiles(srcAppDir, (entryPath) => entryPath.endsWith(`${path.sep}page.tsx`));
  const indexableFiles = pageFiles.filter(isIndexablePageFile);

  const missingMetadataRoutes: string[] = [];
  for (const filePath of indexableFiles) {
    const content = await fs.readFile(filePath, "utf8");
    if (!hasMetadataDefinition(content)) {
      missingMetadataRoutes.push(toRouteFromPageFile(filePath));
    }
  }
  addCheck(
    checks,
    "SEO-C01",
    "Indexable templates must define metadata",
    missingMetadataRoutes.length === 0,
    missingMetadataRoutes.length === 0 ? "All indexable templates have metadata coverage." : `Missing metadata for: ${missingMetadataRoutes.join(", ")}`
  );

  const tokenLayoutFa = await fs.readFile(path.join(srcAppDir, "audit", "r", "[token]", "layout.tsx"), "utf8");
  const tokenLayoutEn = await fs.readFile(path.join(srcAppDir, "en", "audit", "r", "[token]", "layout.tsx"), "utf8");
  const tokenNoindexOk = tokenLayoutFa.includes("buildNoIndexMetadata") && tokenLayoutEn.includes("buildNoIndexMetadata");
  addCheck(checks, "SEO-C02", "Tokenized report routes must be noindex", tokenNoindexOk, tokenNoindexOk ? "FA/EN token layouts enforce noindex." : "Missing noindex metadata on token route layouts.");

  const failedFa = await fs.readFile(path.join(srcAppDir, "failed", "page.tsx"), "utf8");
  const failedEn = await fs.readFile(path.join(srcAppDir, "en", "failed", "page.tsx"), "utf8");
  const failedNoindexOk = failedFa.includes("buildNoIndexMetadata") && failedEn.includes("buildNoIndexMetadata");
  addCheck(checks, "SEO-C03", "Failed utility routes should stay noindex", failedNoindexOk, failedNoindexOk ? "Both failed pages are explicitly noindex." : "One or both failed pages are missing noindex metadata.");

  const sourceFiles = await collectFiles(path.join(repoRoot, "src"), (entryPath) => entryPath.endsWith(".ts") || entryPath.endsWith(".tsx"));
  const localhostFallbackUsage: string[] = [];
  for (const filePath of sourceFiles) {
    if (filePath.endsWith(`${path.sep}src${path.sep}scripts${path.sep}seo-audit-automation.ts`)) {
      continue;
    }
    const content = await fs.readFile(filePath, "utf8");
    if (content.includes('APP_BASE_URL ?? "http://localhost:3000"')) {
      localhostFallbackUsage.push(path.relative(repoRoot, filePath));
    }
  }
  addCheck(
    checks,
    "SEO-C04",
    "Production canonical base URL fallback should be removed",
    localhostFallbackUsage.length === 0,
    localhostFallbackUsage.length === 0 ? "No localhost fallback pattern found in source files." : `Found fallback usage in: ${localhostFallbackUsage.join(", ")}`
  );

  const robotsConfig = robots();
  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
  const disallowValues = rules.flatMap((rule) => {
    const disallow = rule?.disallow ?? [];
    return Array.isArray(disallow) ? disallow : [disallow];
  });
  const robotsOk = ["/api/", "/audit/r/", "/en/audit/r/"].every((value) => disallowValues.includes(value));
  addCheck(checks, "SEO-C05", "robots.txt must block API and token report trees", robotsOk, robotsOk ? "robots rules include API and token route disallow paths." : `Current disallow paths: ${disallowValues.join(", ")}`);

  const sitemapEntries = await Promise.resolve(sitemap());
  const expectedCount = 14 + getGuides("fa").length * 2;
  addCheck(
    checks,
    "SEO-C06",
    "Sitemap entry count should match static + localized guides",
    sitemapEntries.length === expectedCount,
    `Expected ${expectedCount} entries, generated ${sitemapEntries.length}.`
  );

  const faGuides = getGuides("fa");
  const enGuides = getGuides("en");
  const faLocalizedOk = faGuides.every((guide) => /[\u0600-\u06FF]/.test(guide.title));
  const enLocalizedOk = enGuides.every((guide) => /[A-Za-z]/.test(guide.title));
  addCheck(
    checks,
    "SEO-C07",
    "Guides content must be localized for FA and EN",
    faLocalizedOk && enLocalizedOk,
    faLocalizedOk && enLocalizedOk ? "Guide datasets are locale-specific." : "Detected non-localized guide titles in one or both locales."
  );

  const passed = checks.filter((check) => check.outcome === "passed").length;
  const failed = checks.length - passed;
  const summary: Summary = {
    generatedAt: new Date().toISOString(),
    strict,
    checks,
    passed,
    failed
  };

  await fs.mkdir(logsDir, { recursive: true });
  await fs.writeFile(path.join(logsDir, "last-run.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(path.join(logsDir, "last-run.md"), toMarkdown(summary));

  console.log(`SEO checks: passed=${passed}, failed=${failed}`);
  if (strict && failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("seo automation failed", error);
  process.exit(1);
});
