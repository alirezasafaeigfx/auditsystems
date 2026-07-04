const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;

type AuthRateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, AuthRateLimitEntry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkAuthRateLimit(key: string): { allowed: boolean; remaining: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: AUTH_RATE_LIMIT_MAX_ATTEMPTS - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, AUTH_RATE_LIMIT_MAX_ATTEMPTS - entry.count);
  return { allowed: entry.count <= AUTH_RATE_LIMIT_MAX_ATTEMPTS, remaining };
}

export function resetAuthRateLimit(key: string): void {
  store.delete(key);
}

export function getAuthRateLimitConfig() {
  return {
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    maxAttempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS
  };
}
