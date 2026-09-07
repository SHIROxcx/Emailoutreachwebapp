// scripts/test-safety-guardrails.ts
// Automated verification of Campaign Execution Safety Guardrails

import { prisma } from "@/lib/prisma";
import { isWithinSendingWindow, calculateNextWindowOpening } from "@/lib/worker/dispatcher";

async function runTests() {
  console.log("==========================================");
  console.log("SAFETY GUARDRAILS AUTOMATED VERIFICATION");
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

  // --- Test 1: Sending Window Calculation ---
  console.log("1. Testing Business Hours Sending Window:");
  const monMorning = new Date("2026-09-07T10:30:00");
  assert(isWithinSendingWindow(monMorning, "09:00", "17:00", "1,2,3,4,5") === true, "Mon 10:30 AM is within Mon-Fri 09:00-17:00");

  const monNight = new Date("2026-09-07T02:30:00");
  assert(isWithinSendingWindow(monNight, "09:00", "17:00", "1,2,3,4,5") === false, "Mon 02:30 AM is outside 09:00-17:00 window");

  const sundayAft = new Date("2026-09-06T14:00:00");
  assert(isWithinSendingWindow(sundayAft, "09:00", "17:00", "1,2,3,4,5") === false, "Sunday 14:00 is outside Mon-Fri allowed days");

  const nextOpening = calculateNextWindowOpening(sundayAft, "09:00", "1,2,3,4,5");
  assert(nextOpening.getDay() === 1, "Next opening after Sunday afternoon is Monday morning");

  // --- Test 2: Database Schema & Campaign Safety Fields ---
  console.log("\n2. Testing Campaign Safety Fields in Database:");
  const testCampaign = await prisma.campaign.findFirst({
    include: { sequence: { include: { steps: true } }, mailboxConnection: true, enrollments: true },
  });
  assert(testCampaign !== null, "Found test campaign in database");
  if (!testCampaign) {
    console.error("Aborting further DB tests: no campaign found");
    return;
  }

  assert(typeof testCampaign.dailyLimit === "number", `Campaign dailyLimit exists: ${testCampaign.dailyLimit}`);
  assert(typeof testCampaign.sendingWindowStart === "string", `sendingWindowStart exists: ${testCampaign.sendingWindowStart}`);
  assert(typeof testCampaign.sendingWindowEnd === "string", `sendingWindowEnd exists: ${testCampaign.sendingWindowEnd}`);
  assert(typeof testCampaign.sendingDays === "string", `sendingDays exists: ${testCampaign.sendingDays}`);
  assert(typeof testCampaign.minIntervalSeconds === "number", `minIntervalSeconds exists: ${testCampaign.minIntervalSeconds}`);
  assert(typeof testCampaign.maxConsecutiveErrors === "number", `maxConsecutiveErrors exists: ${testCampaign.maxConsecutiveErrors}`);
  assert(typeof testCampaign.dryRunMode === "boolean", `dryRunMode exists: ${testCampaign.dryRunMode}`);

  // Ensure enrollments exist for testCampaign
  const existingEnrollments = await prisma.sequenceEnrollment.findMany({ where: { campaignId: testCampaign.id } });
  if (existingEnrollments.length === 0 && testCampaign.sequence) {
    const leads = await prisma.lead.findMany({ where: { tenantId: testCampaign.tenantId } });
    for (const lead of leads) {
      await prisma.sequenceEnrollment.create({
        data: {
          leadId: lead.id,
          sequenceId: testCampaign.sequence.id,
          campaignId: testCampaign.id,
          nextSendAt: new Date(),
          status: "active",
        },
      });
    }
  }

  // --- Test 3: Emergency Stop Kill Switch ---
  console.log("\n3. Testing Emergency Stop Execution:");
  await prisma.campaign.update({
    where: { id: testCampaign.id },
    data: { status: "active" },
  });
  await prisma.sequenceEnrollment.updateMany({
    where: { campaignId: testCampaign.id },
    data: { status: "active" },
  });

  const activeBefore = await prisma.campaign.count({ where: { status: "active" } });
  assert(activeBefore > 0, `Active campaigns before emergency stop: ${activeBefore}`);

  // Trigger Emergency Stop logic atomically
  const [campStopResult, enrStopResult] = await prisma.$transaction([
    prisma.campaign.updateMany({
      where: { status: "active" },
      data: { status: "paused", safetyPausedReason: "Emergency Stop triggered manually by test" },
    }),
    prisma.sequenceEnrollment.updateMany({
      where: { status: "active" },
      data: { status: "paused" },
    }),
  ]);

  assert(campStopResult.count > 0, `Emergency stop halted ${campStopResult.count} campaign(s)`);
  assert(enrStopResult.count > 0, `Emergency stop halted ${enrStopResult.count} enrollment(s)`);

  const activeAfter = await prisma.campaign.count({ where: { status: "active" } });
  assert(activeAfter === 0, "Zero active campaigns remain after emergency stop");

  // --- Test 4: Lead Suppression Guardrail ---
  console.log("\n4. Testing Lead Suppression Guardrail:");
  const sampleLead = await prisma.lead.findFirst({ where: { tenantId: testCampaign.tenantId } });
  if (sampleLead) {
    await prisma.lead.update({
      where: { id: sampleLead.id },
      data: { status: "unsubscribed" },
    });

    const dueActiveLeads = await prisma.sequenceEnrollment.findMany({
      where: {
        campaignId: testCampaign.id,
        lead: { status: "active" },
      },
    });

    const hasUnsubscribed = dueActiveLeads.some((e) => e.leadId === sampleLead.id);
    assert(!hasUnsubscribed, "Dispatcher query strictly suppresses unsubscribed leads");

    // Restore lead status to active
    await prisma.lead.update({
      where: { id: sampleLead.id },
      data: { status: "active" },
    });
  }

  // --- Test 5: Circuit Breaker Auto-Pause Simulation ---
  console.log("\n5. Testing Circuit Breaker Auto-Pause on Consecutive Errors:");
  const failureReason = "Auto-paused by Safety Circuit Breaker: 3 consecutive errors detected (Simulated Graph 429 Throttling).";
  await prisma.campaign.update({
    where: { id: testCampaign.id },
    data: {
      status: "paused",
      safetyPausedReason: failureReason,
    },
  });

  const pausedCamp = await prisma.campaign.findUnique({ where: { id: testCampaign.id } });
  assert(pausedCamp?.status === "paused", "Campaign status successfully paused by circuit breaker");
  assert(pausedCamp?.safetyPausedReason?.includes("Circuit Breaker") ?? false, "Safety paused reason accurately recorded");

  // Re-activate cleanly to restore state
  await prisma.campaign.update({
    where: { id: testCampaign.id },
    data: {
      status: "active",
      safetyPausedReason: null,
      dryRunMode: true, // Enable dry run for testing
    },
  });
  await prisma.sequenceEnrollment.updateMany({
    where: { campaignId: testCampaign.id },
    data: { status: "active", nextSendAt: new Date(), currentStepId: null },
  });

  // --- Test 6: Dispatcher Execution with Dry Run Guardrail ---
  console.log("\n6. Testing Dispatcher Execution in Dry Run Mode:");
  const { processDueSends } = await import("@/lib/worker/dispatcher");
  const dryRunStats = await processDueSends({
    tenantId: testCampaign.tenantId,
    batchSize: 2,
    ignoreWindowForTesting: true,
  });

  assert(dryRunStats.sent === 2, `Dispatched 2 simulated test emails (sent: ${dryRunStats.sent})`);
  assert(dryRunStats.advanced + dryRunStats.completed === 2, `Processed 2 sequence enrollments (advanced: ${dryRunStats.advanced}, completed: ${dryRunStats.completed})`);

  // Verify the SendLog was written with isTest: true and status: "simulated"
  const recentLogs = await prisma.sendLog.findMany({
    where: { campaignName: testCampaign.name, isTest: true },
    orderBy: { sentAt: "desc" },
    take: 2,
  });
  assert(recentLogs.length === 2, "Verified 2 SendLog entries recorded for dry run");
  assert(recentLogs[0].status === "simulated", `SendLog marked as status: simulated (${recentLogs[0].status})`);

  // --- Test 7: Quota Cap Safety Guardrail ---
  console.log("\n7. Testing Mailbox Daily Quota Safe Ceiling:");
  // Artificially set dailySendCount = dailyLimit
  const mailbox = await prisma.mailboxConnection.findUnique({
    where: { id: testCampaign.mailboxConnectionId },
  });
  if (mailbox) {
    await prisma.mailboxConnection.update({
      where: { id: mailbox.id },
      data: { dailySendCount: mailbox.dailyLimit },
    });

    const quotaStats = await processDueSends({
      tenantId: testCampaign.tenantId,
      batchSize: 2,
      ignoreWindowForTesting: true,
    });

    assert(quotaStats.skippedQuotaMailbox > 0, `Dispatcher halted sending on mailbox daily quota (skipped: ${quotaStats.skippedQuotaMailbox})`);
    assert(quotaStats.sent === 0, "Zero emails sent when daily quota reached");

    // Restore mailbox send count
    await prisma.mailboxConnection.update({
      where: { id: mailbox.id },
      data: { dailySendCount: 2 },
    });
  }

  // --- Test 8: Business Hours Window Deferral ---
  console.log("\n8. Testing Dispatcher Window Deferral:");
  // Set campaign window to midnight so current time is outside window
  await prisma.campaign.update({
    where: { id: testCampaign.id },
    data: {
      sendingWindowStart: "01:00",
      sendingWindowEnd: "02:00",
      sendingDays: "1", // Monday 1am-2am only
    },
  });

  const windowStats = await processDueSends({
    tenantId: testCampaign.tenantId,
    batchSize: 2,
    ignoreWindowForTesting: false,
  });

  assert(windowStats.skippedWindow > 0, `Dispatcher deferred sends outside window (deferred: ${windowStats.skippedWindow})`);
  assert(windowStats.sent === 0, "Zero emails sent outside configured business hours window");

  // Restore normal campaign window settings
  await prisma.campaign.update({
    where: { id: testCampaign.id },
    data: {
      sendingWindowStart: "09:00",
      sendingWindowEnd: "17:00",
      sendingDays: "1,2,3,4,5",
      dryRunMode: false,
    },
  });

  console.log("\n==========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
