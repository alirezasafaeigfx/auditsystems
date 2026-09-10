import process from "node:process";
import { sleep } from "./queue";
import { abortActiveWorkerJobs, runWorkerCycle } from "./worker-cycle";

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
const shutdown = new AbortController();

async function runLoop(): Promise<void> {
  console.log(`Worker started: ${workerId}, concurrency: ${concurrency}, pollMs: ${pollMs}`);

  for (;;) {
    if (isShuttingDown) {
      console.log(`Worker ${workerId}: shutting down gracefully`);
      break;
    }

    const processed = await runWorkerCycle({ workerId, fallbackTimeoutMs, concurrency, signal: shutdown.signal });
    if (processed === 0) {
      await sleep(pollMs);
      continue;
    }
    console.log(`Worker ${workerId}: completed batch of ${processed} job(s)`);
  }
}

function requestShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  shutdown.abort(new Error("WORKER_SHUTDOWN"));
  console.log(`Worker ${workerId}: received ${signal}, aborting active leases`);
  abortActiveWorkerJobs();
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

runLoop().catch((error) => {
  console.error("Worker crashed", error);
  process.exit(1);
});
