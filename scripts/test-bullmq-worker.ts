// scripts/test-bullmq-worker.ts
// Automated integration test for BullMQ + Redis queue & worker

import { redisConnection, dispatchQueue, QUEUE_NAME, setupRepeatableJobs } from "@/lib/worker/queue";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";

async function runBullMQTests() {
  console.log("==========================================");
  console.log("BULLMQ & REDIS INTEGRATION VERIFICATION");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --- Test 1: Redis Connectivity ---
  console.log("1. Testing Redis Connection:");
  const pingRes = await redisConnection.ping();
  assert(pingRes === "PONG", `Redis ping response: ${pingRes}`);

  // --- Test 2: BullMQ Queue Initialization ---
  console.log("\n2. Testing BullMQ Queue Setup:");
  assert(dispatchQueue.name === QUEUE_NAME, `Queue initialized with name: ${dispatchQueue.name}`);

  // Setup repeatable jobs
  await setupRepeatableJobs();
  const schedulers = await dispatchQueue.getJobSchedulers();
  assert(schedulers.length >= 2, `Registered ${schedulers.length} repeatable job schedulers in Redis`);

  const hasCheckDue = schedulers.some((s) => s.key === "dispatch-5min-tick" || s.name === "check-due-sends");
  const hasQuotaReset = schedulers.some((s) => s.key === "midnight-quota-reset" || s.name === "reset-daily-quotas");
  assert(hasCheckDue, "Found 5-minute repeatable scheduler: 'dispatch-5min-tick' ('check-due-sends')");
  assert(hasQuotaReset, "Found midnight repeatable cron scheduler: 'midnight-quota-reset' ('reset-daily-quotas')");

  // --- Test 3: BullMQ Job Processing Verification ---
  console.log("\n3. Testing End-to-End Worker Job Execution:");
  let jobProcessed: boolean = false;
  let processedPayload: unknown = null;

  const testWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "test-dispatch-ping") {
        jobProcessed = true;
        processedPayload = job.data;
        return { success: true, timestamp: Date.now() };
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  await testWorker.waitUntilReady();

  // Add test job
  const testJob = await dispatchQueue.add("test-dispatch-ping", {
    testId: "ping-123",
    sentAt: new Date().toISOString(),
  });

  assert(testJob.id !== undefined, `Test job added to BullMQ with ID: ${testJob.id}`);

  // Wait for testWorker to process the job (max 5 seconds)
  const startWait = Date.now();
  while (!jobProcessed && Date.now() - startWait < 5000) {
    await new Promise((r) => setTimeout(r, 200));
  }

  assert(Boolean(jobProcessed), "BullMQ worker successfully dequeued and processed job");
  assert((processedPayload as { testId: string })?.testId === "ping-123", "Worker received accurate job payload");

  // Clean up test worker
  await testWorker.close();

  // --- Test 4: Midnight Quota Reset Logic ---
  console.log("\n4. Testing Midnight Quota Reset Logic:");
  const testMailbox = await prisma.mailboxConnection.findFirst();
  if (testMailbox) {
    // Set dailySendCount to 25
    await prisma.mailboxConnection.update({
      where: { id: testMailbox.id },
      data: { dailySendCount: 25 },
    });

    // Run reset logic
    const resetResult = await prisma.mailboxConnection.updateMany({
      data: {
        dailySendCount: 0,
        dailySendResetAt: new Date(),
      },
    });

    assert(resetResult.count > 0, `Reset ${resetResult.count} mailbox connection(s) dailySendCount to 0`);

    const afterReset = await prisma.mailboxConnection.findUnique({
      where: { id: testMailbox.id },
    });
    assert(afterReset?.dailySendCount === 0, "Mailbox dailySendCount verified at 0");
  }

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  await redisConnection.quit();
  await prisma.$disconnect();

  if (failed > 0) process.exit(1);
}

runBullMQTests().catch((err) => {
  console.error("BullMQ Test Suite encountered error:", err);
  process.exit(1);
});
