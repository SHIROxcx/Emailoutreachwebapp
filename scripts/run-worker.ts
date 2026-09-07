import { Worker, Job } from "bullmq";
import { redisConnection, QUEUE_NAME, setupRepeatableJobs } from "@/lib/worker/queue";
import { processDueSends } from "@/lib/worker/dispatcher";
import { prisma } from "@/lib/prisma";

console.log("==================================================");
console.log("OUTREACH SCHEDULER — BULLMQ BACKGROUND WORKER");
console.log("==================================================");

async function startWorker() {
  // 1. Ensure repeatable jobs are registered in Redis
  try {
    await setupRepeatableJobs();
    console.log("[Worker] Registered repeatable jobs: 'check-due-sends' (every 5m) & 'reset-daily-quotas' (midnight UTC)");
  } catch (err) {
    console.warn("[Worker] Warning setting up repeatable jobs:", err);
  }

  // 2. Instantiate BullMQ Worker
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const startTime = Date.now();
      console.log(`\n[Job Started] ID: ${job.id} | Name: ${job.name} at ${new Date().toISOString()}`);

      switch (job.name) {
        case "check-due-sends": {
          const stats = await processDueSends();
          const elapsed = Date.now() - startTime;
          console.log(`[Job Completed] check-due-sends in ${elapsed}ms:`);
          console.log(`  Processed: ${stats.processed}`);
          console.log(`  Sent: ${stats.sent}`);
          console.log(`  Advanced: ${stats.advanced}`);
          console.log(`  Completed: ${stats.completed}`);
          if (stats.skippedQuota > 0) {
            console.log(`  Quota holds: ${stats.skippedQuota} (Mailbox: ${stats.skippedQuotaMailbox}, Campaign: ${stats.skippedQuotaCampaign})`);
          }
          if (stats.skippedWindow > 0) {
            console.log(`  Window holds: ${stats.skippedWindow} (outside business hours)`);
          }
          if (stats.skippedSuppression > 0) {
            console.log(`  Suppressed: ${stats.skippedSuppression} (unsubscribed/bounced)`);
          }
          if (stats.circuitBreakersTripped.length > 0) {
            console.log(`  CIRCUIT BREAKERS TRIPPED: ${stats.circuitBreakersTripped.join(", ")}`);
          }
          return stats;
        }

        case "reset-daily-quotas": {
          const resetResult = await prisma.mailboxConnection.updateMany({
            data: {
              dailySendCount: 0,
              dailySendResetAt: new Date(),
            },
          });
          console.log(`[Job Completed] reset-daily-quotas: Reset dailySendCount for ${resetResult.count} mailbox(es)`);
          return { resetCount: resetResult.count };
        }

        default:
          console.log(`[Worker] Unknown job name: ${job.name}, skipping`);
          return null;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Safe sequential processing to avoid concurrent race conditions
    },
  );

  worker.on("ready", () => {
    console.log("[Worker] Connected to Redis and listening on queue:", QUEUE_NAME);
    console.log("[Worker] Daemon is running. Press Ctrl+C to terminate.\n");
  });

  worker.on("failed", (job, err) => {
    console.error(`[Job Failed] ID: ${job?.id} Name: ${job?.name} with error:`, err.message);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down worker gracefully...`);
    await worker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    console.log("[Worker] Cleanup finished. Process exiting.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal error starting worker:", err);
  process.exit(1);
});
