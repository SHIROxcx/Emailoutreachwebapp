import { Queue } from "bullmq";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Shared Redis connection instance configured for BullMQ.
 * Note: BullMQ requires maxRetriesPerRequest: null.
 */
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const QUEUE_NAME = "outreach-dispatch";

export const dispatchQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
});

/**
 * Configures repeatable scheduled jobs in BullMQ v6:
 * 1. check-due-sends: Fired every 5 minutes (300,000ms)
 * 2. reset-daily-quotas: Fired every midnight UTC (0 0 * * *)
 */
export async function setupRepeatableJobs() {
  try {
    // 1. Dispatcher tick every 5 minutes
    await dispatchQueue.upsertJobScheduler(
      "dispatch-5min-tick",
      { every: 5 * 60 * 1000 },
      {
        name: "check-due-sends",
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
    );

    // 2. Daily midnight UTC quota reset
    await dispatchQueue.upsertJobScheduler(
      "midnight-quota-reset",
      { pattern: "0 0 * * *" },
      {
        name: "reset-daily-quotas",
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register repeatable jobs";
    console.error("[BullMQ] setupRepeatableJobs error:", message);
    throw error;
  }
}
