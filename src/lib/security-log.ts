import { logEvent } from "./observability";

export type SecurityEvent =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_rate_limited"
  | "password_changed"
  | "password_change_failed"
  | "role_changed"
  | "session_created"
  | "session_destroyed"
  | "account_locked"
  | "account_unlocked";

export type SecurityLogEntry = {
  event: SecurityEvent;
  userId?: string;
  identifierHash?: string;
  ipHash?: string;
  requestId?: string;
  detail?: string;
  targetUserId?: string;
  oldRole?: string;
  newRole?: string;
};

export function logSecurityEvent(entry: SecurityLogEntry): void {
  const level = getLogLevel(entry.event);

  logEvent(level, `security:${entry.event}`, {
    userId: entry.userId,
    identifierHash: entry.identifierHash,
    ipHash: entry.ipHash,
    requestId: entry.requestId,
    detail: entry.detail,
    targetUserId: entry.targetUserId,
    oldRole: entry.oldRole,
    newRole: entry.newRole,
  });
}

function getLogLevel(event: SecurityEvent): "info" | "warn" | "error" {
  if (event === "login_success" || event === "session_created" || event === "session_destroyed") {
    return "info";
  }
  if (event === "login_failed" || event === "login_rate_limited" || event === "password_change_failed") {
    return "warn";
  }
  return "error";
}
