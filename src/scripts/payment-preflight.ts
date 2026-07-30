import fs from "node:fs/promises";
import path from "node:path";
import { getLocalRedisUrl, pingLocalRedis } from "../lib/localRedis";

type Level = "info" | "warn" | "error";
type Provider = "MOCK" | "ZARINPAL" | "UNSUPPORTED";

type Check = {
  id: string;
  level: Level;
  ok: boolean;
  message: string;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

async function loadDotEnvFileIfNeeded(): Promise<void> {
  const envPath = path.resolve(".env");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      const value = rest.join("=").trim().replace(/^"(.*)"$/, "$1");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore missing .env
  }
}

function provider(): Provider {
  const value = env("PAYMENT_PROVIDER_DEFAULT").toUpperCase();
  if (value === "ZARINPAL") return "ZARINPAL";
  if (!value || value === "MOCK") return "MOCK";
  return "UNSUPPORTED";
}

async function checkRedis(): Promise<Check> {
  const requireDistributed = env("REQUIRE_DISTRIBUTED_RATE_LIMIT").toLowerCase() === "true";
  const url = env("UPSTASH_REDIS_REST_URL");
  const token = env("UPSTASH_REDIS_REST_TOKEN");
  const localRedisUrl = getLocalRedisUrl();
  if (!url || !token) {
    if (localRedisUrl) {
      try {
        const ok = await pingLocalRedis();
        return {
          id: "redis-ping-local",
          level: ok ? "info" : "error",
          ok,
          message: ok ? "Local Redis ping succeeded." : "Local Redis ping failed."
        };
      } catch (error) {
        return {
          id: "redis-ping-local",
          level: "error",
          ok: false,
          message: `Local Redis ping error: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    return {
      id: "redis-config",
      level: requireDistributed ? "error" : "info",
      ok: !requireDistributed,
      message: requireDistributed
        ? "No Redis backend is configured. Set UPSTASH_REDIS_REST_* or REDIS_URL."
        : "No Redis backend is configured; distributed rate-limit is intentionally disabled."
    };
  }

  try {
    const response = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return {
        id: "redis-ping",
        level: "error",
        ok: false,
        message: `Redis ping failed with status ${response.status}.`
      };
    }

    return {
      id: "redis-ping",
      level: "info",
      ok: true,
      message: "Redis ping succeeded."
    };
  } catch (error) {
    return {
      id: "redis-ping",
      level: "error",
      ok: false,
      message: `Redis ping error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function main(): Promise<void> {
  await loadDotEnvFileIfNeeded();
  const strict = process.argv.includes("--strict");
  const checks: Check[] = [];
  const configuredProvider = env("PAYMENT_PROVIDER_DEFAULT").toUpperCase();
  const selectedProvider = provider();
  const production = env("NODE_ENV").toLowerCase() === "production";

  checks.push({
    id: "provider-supported",
    level: "error",
    ok: selectedProvider !== "UNSUPPORTED",
    message: selectedProvider === "UNSUPPORTED"
      ? `Unsupported PAYMENT_PROVIDER_DEFAULT=${configuredProvider || "<empty>"}. Supported providers: ZARINPAL (production), MOCK (development/test).`
      : `PAYMENT_PROVIDER_DEFAULT=${selectedProvider}`
  });

  checks.push({
    id: "provider-production-safe",
    level: "error",
    ok: !production || selectedProvider === "ZARINPAL",
    message: !production || selectedProvider === "ZARINPAL"
      ? "Payment provider is valid for the current environment."
      : "Production requires PAYMENT_PROVIDER_DEFAULT=ZARINPAL; MOCK is development/test only."
  });

  const baseUrl = env("APP_BASE_URL");
  checks.push({
    id: "app-base-url",
    level: "error",
    ok: Boolean(baseUrl),
    message: baseUrl ? `APP_BASE_URL configured (${baseUrl})` : "APP_BASE_URL is missing"
  });

  const downloadSecret = env("DOWNLOAD_TOKEN_SECRET");
  checks.push({
    id: "download-secret",
    level: "error",
    ok: downloadSecret.length >= 16,
    message: downloadSecret.length >= 16 ? "DOWNLOAD_TOKEN_SECRET length is acceptable" : "DOWNLOAD_TOKEN_SECRET must be at least 16 chars"
  });

  if (selectedProvider === "ZARINPAL") {
    const merchantId = env("ZARINPAL_MERCHANT_ID");
    checks.push({
      id: "zarinpal-merchant-id",
      level: "error",
      ok: Boolean(merchantId),
      message: merchantId ? "ZARINPAL_MERCHANT_ID configured" : "ZARINPAL_MERCHANT_ID is required for ZARINPAL provider"
    });
  }

  checks.push(await checkRedis());

  const hasErrors = checks.some((check) => !check.ok && check.level === "error");
  const hasWarnings = checks.some((check) => !check.ok && check.level === "warn");

  const out = {
    generatedAt: new Date().toISOString(),
    strict,
    checks,
    summary: {
      total: checks.length,
      failedErrors: checks.filter((check) => !check.ok && check.level === "error").length,
      warnings: checks.filter((check) => !check.ok && check.level === "warn").length
    }
  };

  const outDir = path.resolve("logs/preflight");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "payment-preflight.json");
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));

  for (const check of checks) {
    const icon = check.ok ? "[OK]" : check.level === "error" ? "[ERR]" : "[WARN]";
    console.log(`${icon} ${check.id} -> ${check.message}`);
  }
  console.log(`Report: ${outPath}`);

  if (strict && (hasErrors || hasWarnings)) process.exit(1);
  if (!strict && hasErrors) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
