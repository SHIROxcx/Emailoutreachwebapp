import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { campaignId, dryRunMode } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        sequence: {
          include: {
            steps: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const newStatus = campaign.status === "active" ? "paused" : "active";

    // GUARDRAIL: Do not allow activating an empty sequence
    if (newStatus === "active") {
      const steps = campaign.sequence?.steps || [];
      if (steps.length === 0) {
        return NextResponse.json(
          { error: "Cannot activate campaign: no sequence steps configured. Add at least one email step first." },
          { status: 400 },
        );
      }
    }

    const updateData: { status: string; safetyPausedReason?: string | null; dryRunMode?: boolean } = {
      status: newStatus,
    };

    if (newStatus === "active") {
      updateData.safetyPausedReason = null; // Clear circuit breaker reason on manual activation
      if (typeof dryRunMode === "boolean") {
        updateData.dryRunMode = dryRunMode;
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Mirror status in active/paused enrollments
    if (newStatus === "paused") {
      await prisma.sequenceEnrollment.updateMany({
        where: { campaignId, status: "active" },
        data: { status: "paused" },
      });
    } else if (newStatus === "active") {
      await prisma.sequenceEnrollment.updateMany({
        where: { campaignId, status: "paused" },
        data: { status: "active" },
      });
    }

    return NextResponse.json({ success: true, newStatus: updated.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
