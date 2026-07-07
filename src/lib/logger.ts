import { logEvent, createLogContext, createRequestId, type LogContext } from "./observability";

export type LoggerContext = LogContext;

export function createLogger(context: LoggerContext) {
  return {
    debug(event: string, data?: Record<string, unknown>): void {
      logEvent("debug", event, { ...context, ...data });
    },
    info(event: string, data?: Record<string, unknown>): void {
      logEvent("info", event, { ...context, ...data });
    },
    warn(event: string, data?: Record<string, unknown>): void {
      logEvent("warn", event, { ...context, ...data });
    },
    error(event: string, data?: Record<string, unknown>): void {
      logEvent("error", event, { ...context, ...data });
    }
  };
}

export function createAuditLogger(requestId: string, auditId: string, userId?: string) {
  const context = createLogContext(requestId, userId, auditId);
  return createLogger(context);
}

export function createPaymentLogger(requestId: string, paymentId: string, userId?: string) {
  const context = createLogContext(requestId, userId, undefined, paymentId);
  return createLogger(context);
}

export function createAuthLogger(requestId: string, userId?: string) {
  const context = createLogContext(requestId, userId);
  return createLogger(context);
}

export function extractRequestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") || createRequestId();
}
