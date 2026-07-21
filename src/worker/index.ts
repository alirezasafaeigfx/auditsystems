import process from "node:process";
import { handlers } from "./audit.handler";
import { leaseNextJob, markJobFailed, markJobSucceeded, recycleExpiredLeases, sleep, type LeasedJob } from "./queue";

const workerId = `worker-${process.pid}`;
const pollMs = Number(process.env.WORKER_POLL_MS ?? "1200");
const fallbackTimeoutMs = Number(process.env.WORKER_JOB_TIMEOUT_MS ?? "45000");
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? "1");
let isShuttingDown = false;

async function runLoop(): Promise<void> {
  console.log(`Worker started: ${workerId}, concurrency: ${concurrency}, pollMs: ${pollMs}`);

  for (;;) {
    if (isShuttingDown) {
      console.log(`Worker ${workerId}: shutting down gracefully`);
      break;
    }

    await recycleExpiredLeases();

    // Try to lease multiple jobs based on concurrency
    const jobs: Array<{ job: LeasedJob; controller: AbortController; timer: NodeJS.Timeout }> = [];

    for (let i = 0; i < concurrency; i++) {
      const job = await leaseNextJob(`${workerId}-${i}`, fallbackTimeoutMs);
      if (job) {
        const controller = new AbortController();
        const timeoutMs = job.timeoutMs || fallbackTimeoutMs;
        const timer = setTimeout(() => controller.abort(new Error("JOB_TIMEOUT")), timeoutMs);
        jobs.push({ job, controller, timer });
      }
    }

    if (jobs.length === 0) {
      await sleep(pollMs);
      continue;
    }

    console.log(`Worker ${workerId}: processing ${jobs.length} jobs concurrently`);

    // Process jobs concurrently
    const jobPromises = jobs.map(async ({ job, controller, timer }) => {
      const jobStart = Date.now();
      try {
        const handler = handlers[job.type as keyof typeof handlers];
        if (!handler) {
          throw new Error(`NO_HANDLER_FOR_${job.type}`);
        }
        await handler(job, controller.signal);
        await markJobSucceeded(job.id);
        console.log(`Worker ${workerId}: job ${job.id} completed in ${Date.now() - jobStart}ms`);
      } catch (error) {
        await markJobFailed(job, error);
        console.error(`Worker ${workerId}: job ${job.id} failed`, error);
      } finally {
        clearTimeout(timer);
      }
    });

    await Promise.all(jobPromises);

    // Log queue statistics
    console.log(`Worker ${workerId}: completed batch of ${jobs.length} jobs`);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log(`Worker ${workerId}: received SIGINT, initiating graceful shutdown`);
  isShuttingDown = true;
});

process.on('SIGTERM', () => {
  console.log(`Worker ${workerId}: received SIGTERM, initiating graceful shutdown`);
  isShuttingDown = true;
});

runLoop().catch((error) => {
  console.error("Worker crashed", error);
  process.exit(1);
});
