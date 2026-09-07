import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = tenantContext.tenantId;

    // Halt all active campaigns and active sequence enrollments atomically
    const [campaignResult, enrollmentResult] = await prisma.$transaction([
      prisma.campaign.updateMany({
        where: {
          tenantId,
          status: "active",
        },
        data: {
          status: "paused",
          safetyPausedReason: "Emergency Stop triggered manually by user",
        },
      }),
      prisma.sequenceEnrollment.updateMany({
        where: {
          campaign: { tenantId },
          status: "active",
        },
        data: {
          status: "paused",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pausedCampaignsCount: campaignResult.count,
      pausedEnrollmentsCount: enrollmentResult.count,
      message: `Emergency Stop activated. Paused ${campaignResult.count} campaign(s) and ${enrollmentResult.count} active enrollment(s).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Emergency stop failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
