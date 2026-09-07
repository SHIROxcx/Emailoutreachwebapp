import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = tenantContext.tenantId;
    const now = new Date();

    const [activeCampaignsCount, dueSendsCount, mailbox] = await Promise.all([
      prisma.campaign.count({
        where: { tenantId, status: "active" },
      }),
      prisma.sequenceEnrollment.count({
        where: {
          campaign: { tenantId, status: "active" },
          status: "active",
          nextSendAt: { lte: now },
          lead: { status: "active" },
        },
      }),
      prisma.mailboxConnection.findFirst({
        where: { user: { tenantId } },
        select: {
          msAccountEmail: true,
          status: true,
          dailySendCount: true,
          dailyLimit: true,
          dailySendResetAt: true,
        },
      }),
    ]);

    const mailboxLimit = mailbox?.dailyLimit || 50;
    const dailySendCount = mailbox?.dailySendCount || 0;

    return NextResponse.json({
      activeCampaignsCount,
      dueSendsCount,
      mailbox: {
        email: mailbox?.msAccountEmail || "",
        status: mailbox?.status || "disconnected",
        dailySendCount,
        dailyLimit: mailboxLimit,
        remainingToday: Math.max(0, mailboxLimit - dailySendCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load worker status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
