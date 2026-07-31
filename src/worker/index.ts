import process from "node:process";
import { handlers } from "./audit.handler";
import {
  heartbeatJobLease,
  leaseNextJob,
  markJobFailed,
  markJobSucceeded,
  recycleExpiredLeases,
  sleep,
  type LeasedJob,
} from "./queue";

function positiveIntegerEnv(name: string, fallback: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(raw) || raw <= 0 || raw > max) {
    throw new Error(`${name}_INVALID`);
  }
  return raw;
}

const workerId = `worker-${process.pid}`;
const pollMs = positiveIntegerEnv("WORKER_POLL_MS", 1200, 60_000);
const fallbackTimeoutMs = positiveIntegerEnv("WORKER_JOB_TIMEOUT_MS", 45_000, 30 * 60_000);
const concurrency = positiveIntegerEnv("WORKER_CONCURRENCY", 1, 32);
let isShuttingDown = false;
const activeControllers = new Set<AbortController>();

type ActiveLease = {
  job: LeasedJob;
  controller: AbortController;
  timeout: NodeJS.Timeout;
  stopHeartbeat: () => void;
};

function heartbeatTiming(timeoutMs: number): { intervalMs: number; extensionMs: number } {
  const intervalMs = Math.max(1000, Math.min(10_000, Math.floor(timeoutMs / 3)));
  return {
    intervalMs,
    extensionMs: Math.max(5000, Math.min(timeoutMs, intervalMs * 3)),
  };
}

function startHeartbeat(job: LeasedJob, controller: AbortController): () => void {
  const timeoutMs = job.timeoutMs || fallbackTimeoutMs;
  const { intervalMs, extensionMs } = heartbeatTiming(timeoutMs);
  let stopped = false;
  let inFlight = false;

  const timer = setInterval(async () => {
    if (stopped || inFlight || controller.signal.aborted) return;
    inFlight = true;
    try {
      const owned = await heartbeatJobLease(job, extensionMs);
      if (!owned && !controller.signal.aborted) {
        controller.abort(new Error("JOB_LEASE_LOST"));
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        controller.abort(new Error("JOB_HEARTBEAT_FAILED", { cause: error }));
      }
    } finally {
      inFlight = false;
    }
  }, intervalMs);
  timer.unref();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

function beginLease(job: LeasedJob): ActiveLease {
  const controller = new AbortController();
  const timeoutMs = job.timeoutMs || fallbackTimeoutMs;
  const stopHeartbeat = startHeartbeat(job, controller);
  const timeout = setTimeout(() => {
    stopHeartbeat();
    controller.abort(new Error("JOB_TIMEOUT"));
  }, timeoutMs);
  activeControllers.add(controller);
  return { job, controller, timeout, stopHeartbeat };
}

function finishLease(lease: ActiveLease): void {
  clearTimeout(lease.timeout);
  lease.stopHeartbeat();
  activeControllers.delete(lease.controller);
}

async function processLease(lease: ActiveLease): Promise<void> {
  const { job, controller } = lease;
  const jobStart = Date.now();

  try {
    const handler = handlers[job.type as keyof typeof handlers];
    if (!handler) throw new Error(`NO_HANDLER_FOR_${job.type}`);

    await handler(job, controller.signal);
    if (controller.signal.aborted) throw controller.signal.reason ?? new Error("JOB_ABORTED");

    const committed = await markJobSucceeded(job);
    if (!committed) {
      console.warn(`Worker ${workerId}: stale completion rejected for job ${job.id} attempt ${job.attempt}`);
      return;
    }
    console.log(`Worker ${workerId}: job ${job.id} completed in ${Date.now() - jobStart}ms`);
  } catch (error) {
    const committed = await markJobFailed(job, error);
    if (committed) {
      console.error(`Worker ${workerId}: job ${job.id} attempt ${job.attempt} failed`, error);
    } else {
      console.warn(`Worker ${workerId}: stale failure rejected for job ${job.id} attempt ${job.attempt}`);
    }
  } finally {
    finishLease(lease);
  }
}

async function runLoop(): Promise<void> {
  console.log(`Worker started: ${workerId}, concurrency: ${concurrency}, pollMs: ${pollMs}`);

  for (;;) {
    if (isShuttingDown) {
      console.log(`Worker ${workerId}: shutting down gracefully`);
      break;
    }

    const recycled = await recycleExpiredLeases();
    if (recycled > 0) {
      console.warn(`Worker ${workerId}: recycled ${recycled} expired lease(s)`);
    }

    const leases: ActiveLease[] = [];
    for (let index = 0; index < concurrency && !isShuttingDown; index += 1) {
      const job = await leaseNextJob(`${workerId}-${index}`, fallbackTimeoutMs);
      if (job) leases.push(beginLease(job));
    }

    if (leases.length === 0) {
      await sleep(pollMs);
      continue;
    }

    console.log(`Worker ${workerId}: processing ${leases.length} job(s) concurrently`);
    await Promise.all(leases.map(processLease));
    console.log(`Worker ${workerId}: completed batch of ${leases.length} job(s)`);
  }
}

function requestShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Worker ${workerId}: received ${signal}, aborting active leases`);
  for (const controller of activeControllers) {
    if (!controller.signal.aborted) controller.abort(new Error("WORKER_SHUTDOWN"));
  }
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

runLoop().catch((error) => {
  console.error("Worker crashed", error);
  process.exit(1);
});
