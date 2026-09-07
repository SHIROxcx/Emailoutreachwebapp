import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

interface StepUpdateInput {
  id?: string;
  stepOrder: number;
  delayDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

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

    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      steps,
      dailyLimit,
      sendingWindowStart,
      sendingWindowEnd,
      sendingDays,
      minIntervalSeconds,
      maxConsecutiveErrors,
      dryRunMode,
    } = body as {
      name?: string;
      steps?: StepUpdateInput[];
      dailyLimit?: number;
      sendingWindowStart?: string;
      sendingWindowEnd?: string;
      sendingDays?: string;
      minIntervalSeconds?: number;
      maxConsecutiveErrors?: number;
      dryRunMode?: boolean;
    };

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
      include: { sequence: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Ensure sequence exists
    let sequenceId = campaign.sequence?.id;
    if (!sequenceId) {
      const newSeq = await prisma.sequence.create({
        data: { campaignId: campaign.id },
      });
      sequenceId = newSeq.id;
    }

    // Update campaign attributes including safety guardrails
    const updateData: Record<string, unknown> = {};
    if (name && name.trim().length > 0) updateData.name = name.trim();
    if (typeof dailyLimit === "number") updateData.dailyLimit = Math.max(1, Math.min(200, dailyLimit));
    if (typeof sendingWindowStart === "string") updateData.sendingWindowStart = sendingWindowStart;
    if (typeof sendingWindowEnd === "string") updateData.sendingWindowEnd = sendingWindowEnd;
    if (typeof sendingDays === "string") updateData.sendingDays = sendingDays;
    if (typeof minIntervalSeconds === "number") updateData.minIntervalSeconds = Math.max(5, minIntervalSeconds);
    if (typeof maxConsecutiveErrors === "number") updateData.maxConsecutiveErrors = Math.max(1, maxConsecutiveErrors);
    if (typeof dryRunMode === "boolean") updateData.dryRunMode = dryRunMode;

    if (Object.keys(updateData).length > 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: updateData,
      });
    }

    // Replace or sync steps inside transaction
    if (Array.isArray(steps)) {
      await prisma.$transaction(async (tx) => {
        // Remove existing steps for this sequence
        await tx.sequenceStep.deleteMany({
          where: { sequenceId },
        });

        // Insert fresh steps in order
        if (steps.length > 0) {
          await tx.sequenceStep.createMany({
            data: steps.map((s, idx) => ({
              sequenceId,
              stepOrder: idx + 1,
              delayDays: Math.max(0, s.delayDays || 0),
              subjectTemplate: s.subjectTemplate || "Untitled Step",
              bodyTemplate: s.bodyTemplate || "",
            })),
          });
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update sequence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
      include: { sequence: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Cascade delete enrollments, steps, sequence, and campaign inside transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all enrollments for this campaign
      await tx.sequenceEnrollment.deleteMany({
        where: { campaignId: id },
      });

      // 2. If a sequence exists, delete its steps and the sequence itself
      if (campaign.sequence) {
        await tx.sequenceStep.deleteMany({
          where: { sequenceId: campaign.sequence.id },
        });

        await tx.sequence.delete({
          where: { id: campaign.sequence.id },
        });
      }

      // 3. Delete the campaign
      await tx.campaign.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
