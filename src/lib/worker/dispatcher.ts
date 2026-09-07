import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sendMail } from "@/lib/graph";
import { GRAPH_SCOPES, msalClient } from "@/lib/msal";
import { renderTemplate } from "@/lib/template-engine";

export interface DispatchOptions {
  tenantId?: string;
  fastForwardDays?: number;
  batchSize?: number;
  ignoreWindowForTesting?: boolean;
}

export interface DispatchStats {
  processed: number;
  sent: number;
  advanced: number;
  completed: number;
  skippedQuota: number;
  skippedQuotaMailbox: number;
  skippedQuotaCampaign: number;
  skippedWindow: number;
  skippedSuppression: number;
  circuitBreakersTripped: string[];
  errors: string[];
}

/**
 * Validates whether the given timestamp falls within the allowed business-hour sending window.
 * days: comma-separated string where 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
 */
export function isWithinSendingWindow(
  date: Date,
  startHHMM: string = "09:00",
  endHHMM: string = "17:00",
  allowedDaysStr: string = "1,2,3,4,5",
): boolean {
  const dayNum = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon, 7=Sun
  const allowedDays = allowedDaysStr
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (!allowedDays.includes(dayNum)) {
    return false;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const [startH, startM] = (startHHMM || "09:00").split(":").map(Number);
  const [endH, endM] = (endHHMM || "17:00").split(":").map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Calculates the next future timestamp when the sending window opens.
 */
export function calculateNextWindowOpening(
  current: Date,
  startHHMM: string = "09:00",
  allowedDaysStr: string = "1,2,3,4,5",
): Date {
  const [startH, startM] = (startHHMM || "09:00").split(":").map(Number);
  const allowedDays = allowedDaysStr
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const candidate = new Date(current.getTime() + dayOffset * 86400000);
    candidate.setHours(startH || 9, startM || 0, 0, 0);

    if (candidate.getTime() > current.getTime()) {
      const dayNum = candidate.getDay() === 0 ? 7 : candidate.getDay();
      if (allowedDays.includes(dayNum)) {
        return candidate;
      }
    }
  }

  // Fallback: 24 hours later
  return new Date(current.getTime() + 86400000);
}

export async function processDueSends(
  options: DispatchOptions = {},
): Promise<DispatchStats> {
  const stats: DispatchStats = {
    processed: 0,
    sent: 0,
    advanced: 0,
    completed: 0,
    skippedQuota: 0,
    skippedQuotaMailbox: 0,
    skippedQuotaCampaign: 0,
    skippedWindow: 0,
    skippedSuppression: 0,
    circuitBreakersTripped: [],
    errors: [],
  };

  const now = new Date();
  const targetDate = options.fastForwardDays
    ? new Date(now.getTime() + options.fastForwardDays * 86400000)
    : now;

  // 1. Fetch active enrollments due to be sent
  // GUARDRAIL: Strict DB filter excludes leads that are unsubscribed or bounced
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "active",
      nextSendAt: { lte: targetDate },
      lead: {
        status: "active",
      },
      campaign: {
        status: "active",
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
      },
    },
    include: {
      lead: true,
      campaign: {
        include: {
          mailboxConnection: true,
          sequence: {
            include: {
              steps: {
                orderBy: { stepOrder: "asc" },
              },
            },
          },
        },
      },
    },
    take: options.batchSize || 50,
  });

  if (dueEnrollments.length === 0) {
    return stats;
  }

  // Circuit breaker state for the current pass
  const consecutiveErrorsPerCampaign = new Map<string, number>();
  const trippedCampaignIds = new Set<string>();

  for (const enrollment of dueEnrollments) {
    const campaign = enrollment.campaign;

    // GUARDRAIL: If this campaign already tripped its circuit breaker during this pass, skip immediately
    if (trippedCampaignIds.has(campaign.id)) {
      continue;
    }

    try {
      stats.processed++;

      // GUARDRAIL 1: Lead Suppression Check (Double check in case status changed mid-run)
      if (enrollment.lead.status !== "active") {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: enrollment.lead.status === "unsubscribed" ? "paused" : "bounced",
          },
        });
        stats.skippedSuppression++;
        continue;
      }

      // GUARDRAIL 2: Business-Hours Sending Window Check
      if (!options.ignoreWindowForTesting) {
        const inWindow = isWithinSendingWindow(
          targetDate,
          campaign.sendingWindowStart,
          campaign.sendingWindowEnd,
          campaign.sendingDays,
        );

        if (!inWindow) {
          const nextOpening = calculateNextWindowOpening(
            targetDate,
            campaign.sendingWindowStart,
            campaign.sendingDays,
          );
          // Reschedule enrollment to the next valid window without failing
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { nextSendAt: nextOpening },
          });
          stats.skippedWindow++;
          continue;
        }
      }

      // GUARDRAIL 3: Mailbox Daily Safe Sending Cap
      const connection = campaign.mailboxConnection;
      const mailboxLimit = connection.dailyLimit || 50;
      if (connection.dailySendCount >= mailboxLimit) {
        stats.skippedQuotaMailbox++;
        stats.skippedQuota++;
        continue;
      }

      // GUARDRAIL 4: Campaign Daily Safe Sending Cap
      const campaignLimit = campaign.dailyLimit || 30;
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const campaignSendsToday = await prisma.sendLog.count({
        where: {
          campaignName: campaign.name,
          sentAt: { gte: startOfDay },
          status: { in: ["sent", "simulated"] },
        },
      });

      if (campaignSendsToday >= campaignLimit) {
        stats.skippedQuotaCampaign++;
        stats.skippedQuota++;
        continue;
      }

      const sequence = campaign.sequence;
      const steps = sequence?.steps || [];

      if (steps.length === 0) {
        // No sequence steps configured; pause enrollment safely
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "paused" },
        });
        stats.errors.push(`Campaign ${campaign.name} has no sequence steps configured.`);
        continue;
      }

      // Determine target step
      let targetStep = null;
      if (!enrollment.currentStepId) {
        targetStep = steps[0];
      } else {
        const currentIdx = steps.findIndex((s) => s.id === enrollment.currentStepId);
        if (currentIdx >= 0 && currentIdx + 1 < steps.length) {
          targetStep = steps[currentIdx + 1];
        }
      }

      if (!targetStep) {
        // All steps completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed" },
        });
        stats.completed++;
        continue;
      }

      // GUARDRAIL 5: Template Safety (Prevent blank subjects or bodies)
      if (!targetStep.subjectTemplate?.trim() || !targetStep.bodyTemplate?.trim()) {
        throw new Error(
          `Campaign ${campaign.name} step ${targetStep.stepOrder} has an empty subject or body template.`,
        );
      }

      // Personalize Subject and Body with Spintax & Lead Variables
      const leadVars: Record<string, string | undefined> = {
        email: enrollment.lead.email,
        firstName: enrollment.lead.firstName || undefined,
        lastName: enrollment.lead.lastName || undefined,
        company: enrollment.lead.company || undefined,
      };

      const resolvedSubject = renderTemplate(targetStep.subjectTemplate, leadVars);
      const resolvedBody = renderTemplate(targetStep.bodyTemplate, leadVars);

      // GUARDRAIL 6: Dry Run / Simulation Mode Check
      const isDryRun = campaign.dryRunMode;
      const isDemo =
        isDryRun ||
        connection.msAccountEmail.startsWith("demo.") ||
        connection.msAccountEmail.endsWith("@example.com") ||
        !process.env.MS_CLIENT_ID;

      let messageId = isDryRun
        ? `dry_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        : `sim_seq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      if (!isDemo) {
        // Real Microsoft Graph dispatch
        let accessToken = decryptSecret(connection.accessTokenEncrypted);

        // Pre-flight token expiration check
        if (connection.tokenExpiresAt.getTime() - now.getTime() < 120_000) {
          const refreshToken = decryptSecret(connection.refreshTokenEncrypted);
          const refreshed = await msalClient.acquireTokenByRefreshToken({
            scopes: GRAPH_SCOPES,
            refreshToken,
          });

          if (!refreshed?.accessToken) {
            throw new Error(`Failed to refresh token for mailbox ${connection.msAccountEmail}`);
          }

          accessToken = refreshed.accessToken;
          const newAccessTokenEncrypted = encryptSecret(accessToken);
          const newExpiresAt = new Date(
            (refreshed.expiresOn ?? new Date()).getTime() - 60_000,
          );

          await prisma.mailboxConnection.update({
            where: { id: connection.id },
            data: {
              accessTokenEncrypted: newAccessTokenEncrypted,
              tokenExpiresAt: newExpiresAt,
            },
          });
        }

        await sendMail(accessToken, {
          toEmail: enrollment.lead.email,
          subject: resolvedSubject,
          bodyText: resolvedBody,
        });

        messageId = `graph_seq_${Date.now()}`;
      }

      // Update Database: SendLog, Mailbox Count, and Next Step Transition
      await prisma.$transaction(async (tx) => {
        await tx.sendLog.create({
          data: {
            enrollmentId: enrollment.id,
            stepId: targetStep.id,
            recipientEmail: enrollment.lead.email,
            subject: resolvedSubject,
            bodyPreview: resolvedBody,
            campaignName: campaign.name,
            isTest: isDryRun,
            graphMessageId: messageId,
            status: isDemo ? "simulated" : "sent",
          },
        });

        await tx.mailboxConnection.update({
          where: { id: connection.id },
          data: { dailySendCount: { increment: 1 } },
        });

        const currentStepIdx = steps.findIndex((s) => s.id === targetStep.id);
        const nextStep = steps[currentStepIdx + 1];

        if (nextStep) {
          const delayDays = Math.max(1, nextStep.delayDays);
          const nextSendTime = new Date(now.getTime() + delayDays * 86400000);

          await tx.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStepId: targetStep.id,
              nextSendAt: nextSendTime,
              status: "active",
            },
          });
          stats.advanced++;
        } else {
          await tx.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStepId: targetStep.id,
              status: "completed",
            },
          });
          stats.completed++;
        }
      });

      // Dispatch successful: Reset consecutive error count for this campaign
      consecutiveErrorsPerCampaign.set(campaign.id, 0);
      stats.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Dispatch error";
      stats.errors.push(`Campaign "${campaign.name}" - Lead ${enrollment.lead.email}: ${msg}`);

      // GUARDRAIL 7: Circuit Breaker Failure Tracking & Auto-Pause
      const currentConsecutive = (consecutiveErrorsPerCampaign.get(campaign.id) || 0) + 1;
      consecutiveErrorsPerCampaign.set(campaign.id, currentConsecutive);

      const threshold = campaign.maxConsecutiveErrors || 3;
      if (currentConsecutive >= threshold) {
        trippedCampaignIds.add(campaign.id);
        const reason = `Auto-paused by Safety Circuit Breaker: ${threshold} consecutive errors detected (${msg}).`;

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "paused",
            safetyPausedReason: reason,
          },
        });

        stats.circuitBreakersTripped.push(campaign.name);
      }
    }
  }

  return stats;
}
