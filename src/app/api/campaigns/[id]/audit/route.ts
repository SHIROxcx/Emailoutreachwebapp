import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";
import { isWithinSendingWindow } from "@/lib/worker/dispatcher";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: {
        mailboxConnection: true,
        sequence: {
          include: {
            steps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        enrollments: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Mailbox Health Check
    const mailbox = campaign.mailboxConnection;
    const mailboxLimit = mailbox.dailyLimit || 50;
    const mailboxRemaining = Math.max(0, mailboxLimit - mailbox.dailySendCount);

    if (mailbox.status !== "connected") {
      blockers.push(`Mailbox ${mailbox.msAccountEmail} is in "${mailbox.status}" state.`);
    }

    const now = new Date();
    if (mailbox.tokenExpiresAt.getTime() < now.getTime()) {
      warnings.push(`Mailbox token is expired and will require refresh on first send.`);
    }

    if (mailboxRemaining === 0) {
      warnings.push(`Mailbox has reached its safe limit of ${mailboxLimit} sends today. Sends will resume after midnight UTC.`);
    }

    // 2. Sequence Steps Readiness
    const steps = campaign.sequence?.steps || [];
    if (steps.length === 0) {
      blockers.push("Sequence has 0 steps configured. Add at least one step before activating.");
    }

    let hasEmptyTemplates = false;
    let hasMalformedMergeTags = false;

    for (const step of steps) {
      if (!step.subjectTemplate.trim() || !step.bodyTemplate.trim()) {
        hasEmptyTemplates = true;
      }
      // Check for unclosed merge tags e.g. {{firstName without }}
      const openMatches = (step.bodyTemplate.match(/\{\{/g) || []).length;
      const closeMatches = (step.bodyTemplate.match(/\}\}/g) || []).length;
      if (openMatches !== closeMatches) {
        hasMalformedMergeTags = true;
      }
    }

    if (hasEmptyTemplates) {
      blockers.push("One or more sequence steps have an empty subject or email body.");
    }
    if (hasMalformedMergeTags) {
      warnings.push("One or more sequence steps may contain unclosed merge tags (e.g. '{{' without '}}').");
    }

    // 3. Audience & Suppression Check
    const totalEnrolled = campaign.enrollments.length;
    const activeEnrollments = campaign.enrollments.filter(
      (e) => e.status === "active" && e.lead.status === "active",
    ).length;
    const suppressedEnrollments = campaign.enrollments.filter(
      (e) => e.lead.status !== "active",
    ).length;

    if (totalEnrolled === 0) {
      warnings.push("No leads are currently enrolled in this campaign.");
    } else if (activeEnrollments === 0) {
      warnings.push("All enrolled leads are currently paused, completed, or suppressed.");
    }

    if (suppressedEnrollments > 0) {
      warnings.push(`${suppressedEnrollments} leads are unsubscribed or bounced and will be automatically suppressed.`);
    }

    // 4. Delivery Window & Safety Settings Check
    const inWindowNow = isWithinSendingWindow(
      now,
      campaign.sendingWindowStart,
      campaign.sendingWindowEnd,
      campaign.sendingDays,
    );

    if (!inWindowNow) {
      warnings.push(
        `Current time is outside the business hours sending window (${campaign.sendingWindowStart} - ${campaign.sendingWindowEnd}, Days: ${campaign.sendingDays}). Sends will be held until the window opens.`,
      );
    }

    const canActivate = blockers.length === 0;

    return NextResponse.json({
      canActivate,
      blockers,
      warnings,
      details: {
        mailbox: {
          email: mailbox.msAccountEmail,
          status: mailbox.status,
          dailySendCount: mailbox.dailySendCount,
          dailyLimit: mailboxLimit,
          remaining: mailboxRemaining,
        },
        sequence: {
          stepCount: steps.length,
          delays: steps.map((s) => s.delayDays),
        },
        audience: {
          totalEnrolled,
          activeEnrollments,
          suppressedEnrollments,
        },
        guardrails: {
          dailyLimit: campaign.dailyLimit,
          sendingWindow: `${campaign.sendingWindowStart} - ${campaign.sendingWindowEnd}`,
          sendingDays: campaign.sendingDays,
          minIntervalSeconds: campaign.minIntervalSeconds,
          maxConsecutiveErrors: campaign.maxConsecutiveErrors,
          dryRunMode: campaign.dryRunMode,
          safetyPausedReason: campaign.safetyPausedReason,
          inWindowNow,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to audit campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
