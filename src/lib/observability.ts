import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId: string;
  userId?: string;
  auditId?: string;
  paymentId?: string;
}

const LOG_DIR = process.env.LOG_DIR || "logs";
const LOG_LEVEL_THRESHOLD: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function getMinLogLevel(): number {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
  return LOG_LEVEL_THRESHOLD[env] ?? LOG_LEVEL_THRESHOLD.info;
}

export function createRequestId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function createLogContext(
  requestId: string,
  userId?: string,
  auditId?: string,
  paymentId?: string
): LogContext {
  const ctx: LogContext = { requestId };
  if (userId) ctx.userId = userId;
  if (auditId) ctx.auditId = auditId;
  if (paymentId) ctx.paymentId = paymentId;
  return ctx;
}

function getDailyLogPath(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return path.join(LOG_DIR, `audit-${dateStr}.log`);
}

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeToFile(line: string): void {
  try {
    ensureLogDir();
    fs.appendFileSync(getDailyLogPath(), line + "\n", { flag: "a" });
  } catch {
    // File write failures should not break the app
  }
}

export function respondJson(body: unknown, requestId: string, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", requestId);
  return NextResponse.json(body, { ...init, headers });
}

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown>): void {
  const threshold = getMinLogLevel();
  const levelNum = LOG_LEVEL_THRESHOLD[level] ?? LOG_LEVEL_THRESHOLD.info;
  if (levelNum < threshold) return;

  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data
  };
  const line = JSON.stringify(record);

  writeToFile(line);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
