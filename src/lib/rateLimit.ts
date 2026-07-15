import { logEvent } from "./observability";
import { consumeLocalRedisWindow, getLocalRedisUrl } from "./localRedis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSec: number;
  backend: "upstash-redis" | "local-redis" | "disabled" | "error";
};

export function isDistributedRateLimitRequired(): boolean {
  return String(process.env.REQUIRE_DISTRIBUTED_RATE_LIMIT ?? "").trim().toLowerCase() === "true";
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;
  return { url, token };
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function consumeDistributedRateLimit(input: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      const response = await fetch(`${cfg.url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          ["INCR", input.key],
          ["EXPIRE", input.key, String(input.windowSec), "NX"],
          ["TTL", input.key]
        ])
      });

      if (!response.ok) {
        throw new Error(`UPSTASH_HTTP_${response.status}`);
      }

      const body = (await response.json()) as Array<{ result?: unknown }>;
      const count = Number(body[0]?.result ?? 0);
      const ttl = Math.max(0, Number(body[2]?.result ?? input.windowSec));
      const allowed = count <= input.limit;
      const remaining = Math.max(0, input.limit - count);

      return {
        allowed,
        remaining,
        limit: input.limit,
        resetSec: ttl,
        backend: "upstash-redis"
      };
    } catch (error) {
      logEvent("error", "rate_limit_backend_error", {
        code: error instanceof Error ? error.message : String(error),
        backend: "upstash-redis"
      });
    }
  }

  try {
    if (!getLocalRedisUrl()) {
      return {
        allowed: !isProduction(),
        remaining: input.limit,
        limit: input.limit,
        resetSec: input.windowSec,
        backend: "disabled"
      };
    }

    const { count, ttl } = await consumeLocalRedisWindow({
      key: input.key,
      windowSec: input.windowSec
    });
    const allowed = count <= input.limit;
    const remaining = Math.max(0, input.limit - count);
    return {
      allowed,
      remaining,
      limit: input.limit,
      resetSec: ttl,
      backend: "local-redis"
    };
  } catch (error) {
    logEvent("error", "rate_limit_backend_error", {
      code: error instanceof Error ? error.message : String(error),
      backend: "local-redis"
    });

    return {
      allowed: !isProduction(),
      remaining: input.limit,
      limit: input.limit,
      resetSec: input.windowSec,
      backend: "error"
    };
  }
}
