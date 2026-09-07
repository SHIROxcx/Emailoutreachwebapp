import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const where: { isTest?: boolean } = {};
    if (type === "test") {
      where.isTest = true;
    } else if (type === "campaign") {
      where.isTest = false;
    }

    const logs = await prisma.sendLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      recipientEmail: log.recipientEmail,
      subject: log.subject,
      bodyPreview: log.bodyPreview,
      campaignName: log.campaignName,
      isTest: log.isTest,
      sentAt: log.sentAt.toISOString(),
      graphMessageId: log.graphMessageId,
      status: log.status,
    }));

    return NextResponse.json({ logs: formatted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
