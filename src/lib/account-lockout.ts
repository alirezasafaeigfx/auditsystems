const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

type LockoutEntry = { failures: number; firstFailureAt: number; lockedUntil: number | null };

const store = new Map<string, LockoutEntry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      store.delete(key);
    } else if (!entry.lockedUntil && entry.firstFailureAt + LOCKOUT_WINDOW_MS < now) {
      store.delete(key);
    }
  }
}

export function isAccountLocked(identifier: string): { locked: boolean; retryAfterSec: number } {
  cleanup();
  const entry = store.get(identifier);
  if (!entry) return { locked: false, retryAfterSec: 0 };
  if (!entry.lockedUntil) return { locked: false, retryAfterSec: 0 };

  const now = Date.now();
  if (entry.lockedUntil <= now) {
    store.delete(identifier);
    return { locked: false, retryAfterSec: 0 };
  }

  return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
}

export function recordFailedLogin(identifier: string): { locked: boolean; retryAfterSec: number } {
  cleanup();
  const now = Date.now();
  const existing = store.get(identifier);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((existing.lockedUntil - now) / 1000) };
  }

  let failures: number;
  let firstFailureAt: number;

  if (existing && now - existing.firstFailureAt <= LOCKOUT_WINDOW_MS) {
    failures = existing.failures + 1;
    firstFailureAt = existing.firstFailureAt;
  } else {
    failures = 1;
    firstFailureAt = now;
  }

  if (failures >= LOCKOUT_THRESHOLD) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    store.set(identifier, { failures, firstFailureAt, lockedUntil });
    return { locked: true, retryAfterSec: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  store.set(identifier, { failures, firstFailureAt, lockedUntil: null });
  return { locked: false, retryAfterSec: 0 };
}

export function clearFailedLogins(identifier: string): void {
  store.delete(identifier);
}

export function getLockoutConfig() {
  return {
    threshold: LOCKOUT_THRESHOLD,
    windowMs: LOCKOUT_WINDOW_MS,
    durationMs: LOCKOUT_DURATION_MS,
  };
}
