import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, leadIds } = body as {
      batchId?: string;
      leadIds?: string[];
    };

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, tenantId: tenantContext.tenantId },
      include: { sequence: true },
    });

    if (!campaign || !campaign.sequence) {
      return NextResponse.json(
        { error: "Campaign sequence not found. Please add at least one step first." },
        { status: 400 },
      );
    }

    // Find candidate leads
    const whereClause: {
      tenantId: string;
      importBatchId?: string;
      id?: { in: string[] };
    } = { tenantId: tenantContext.tenantId };

    if (batchId) {
      whereClause.importBatchId = batchId;
    } else if (Array.isArray(leadIds) && leadIds.length > 0) {
      whereClause.id = { in: leadIds };
    }

    const candidateLeads = await prisma.lead.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (candidateLeads.length === 0) {
      return NextResponse.json(
        { error: "No matching leads found to enroll." },
        { status: 400 },
      );
    }

    // Check existing enrollments to avoid duplicate enrollment
    const existing = await prisma.sequenceEnrollment.findMany({
      where: { campaignId },
      select: { leadId: true },
    });
    const enrolledLeadIdSet = new Set(existing.map((e) => e.leadId));

    const toEnroll = candidateLeads
      .filter((l) => !enrolledLeadIdSet.has(l.id))
      .map((l) => ({
        leadId: l.id,
        sequenceId: campaign.sequence!.id,
        campaignId: campaign.id,
        currentStepId: null,
        nextSendAt: new Date(),
        status: "active",
      }));

    if (toEnroll.length > 0) {
      await prisma.sequenceEnrollment.createMany({
        data: toEnroll,
      });
    }

    return NextResponse.json({
      success: true,
      enrolledCount: toEnroll.length,
      skippedCount: candidateLeads.length - toEnroll.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enroll leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
