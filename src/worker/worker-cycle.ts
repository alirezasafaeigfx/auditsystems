import { handlers } from "./audit.handler";
import {
  heartbeatJobLease,
  leaseNextJob,
  markJobFailed,
  markJobSucceeded,
  recycleExpiredLeases,
  type LeasedJob,
} from "./queue";

export type WorkerCycleOptions = {
  workerId: string;
  fallbackTimeoutMs: number;
  concurrency?: number;
  signal?: AbortSignal;
};

type ActiveLease = {
  job: LeasedJob;
  controller: AbortController;
  timeout: NodeJS.Timeout;
  stopHeartbeat: () => void;
};

const activeControllers = new Set<AbortController>();

function heartbeatTiming(timeoutMs: number): { intervalMs: number; extensionMs: number } {
  const intervalMs = Math.max(1000, Math.min(10_000, Math.floor(timeoutMs / 3)));
  return {
    intervalMs,
    extensionMs: Math.max(5000, Math.min(timeoutMs, intervalMs * 3)),
  };
}

function startHeartbeat(job: LeasedJob, controller: AbortController, fallbackTimeoutMs: number): () => void {
  const timeoutMs = job.timeoutMs || fallbackTimeoutMs;
  const { intervalMs, extensionMs } = heartbeatTiming(timeoutMs);
  let stopped = false;
  let inFlight = false;
  const timer = setInterval(async () => {
    if (stopped || inFlight || controller.signal.aborted) return;
    inFlight = true;
    try {
      const owned = await heartbeatJobLease(job, extensionMs);
      if (!owned && !controller.signal.aborted) controller.abort(new Error("JOB_LEASE_LOST"));
    } catch (error) {
      if (!controller.signal.aborted) controller.abort(new Error("JOB_HEARTBEAT_FAILED", { cause: error }));
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

function beginLease(job: LeasedJob, fallbackTimeoutMs: number, signal?: AbortSignal): ActiveLease {
  const controller = new AbortController();
  if (signal?.aborted) controller.abort(signal.reason ?? new Error("WORKER_SHUTDOWN"));
  const timeoutMs = job.timeoutMs || fallbackTimeoutMs;
  const stopHeartbeat = controller.signal.aborted
    ? () => undefined
    : startHeartbeat(job, controller, fallbackTimeoutMs);
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

async function processLease(lease: ActiveLease, workerId: string): Promise<void> {
  const { job, controller } = lease;
  const jobStart = Date.now();
  try {
    if (controller.signal.aborted) throw controller.signal.reason ?? new Error("JOB_ABORTED");
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
    if (committed) console.error(`Worker ${workerId}: job ${job.id} attempt ${job.attempt} failed`, error);
    else console.warn(`Worker ${workerId}: stale failure rejected for job ${job.id} attempt ${job.attempt}`);
  } finally {
    finishLease(lease);
  }
}

export async function runWorkerCycle(options: WorkerCycleOptions): Promise<number> {
  const concurrency = options.concurrency ?? 1;
  if (options.signal?.aborted) return 0;
  const recycled = await recycleExpiredLeases();
  if (recycled > 0) console.warn(`Worker ${options.workerId}: recycled ${recycled} expired lease(s)`);
  if (options.signal?.aborted) return 0;
  const leases: ActiveLease[] = [];
  for (let index = 0; index < concurrency; index += 1) {
    if (options.signal?.aborted) break;
    const job = await leaseNextJob(`${options.workerId}-${index}`, options.fallbackTimeoutMs);
    if (job) leases.push(beginLease(job, options.fallbackTimeoutMs, options.signal));
  }
  if (leases.length > 0) await Promise.all(leases.map((lease) => processLease(lease, options.workerId)));
  return leases.length;
}

export function abortActiveWorkerJobs(): void {
  for (const controller of activeControllers) {
    if (!controller.signal.aborted) controller.abort(new Error("WORKER_SHUTDOWN"));
  }
}
