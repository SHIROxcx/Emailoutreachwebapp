import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const newStatus = campaign.status === "active" ? "paused" : "active";

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: newStatus },
    });

    // Mirror status in active enrollments
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
