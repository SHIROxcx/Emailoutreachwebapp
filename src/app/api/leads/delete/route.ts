import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, leadIds, batchId } = body;

    if (!leadId && (!Array.isArray(leadIds) || leadIds.length === 0) && !batchId) {
      return NextResponse.json(
        { error: "Provide leadId, leadIds array, or batchId to delete." },
        { status: 400 },
      );
    }

    const idsToDelete: string[] = [];
    if (leadId) {
      idsToDelete.push(leadId);
    } else if (Array.isArray(leadIds)) {
      idsToDelete.push(...leadIds);
    } else if (batchId) {
      const batchLeads = await prisma.lead.findMany({
        where: { importBatchId: batchId, tenantId: tenantContext.tenantId },
        select: { id: true },
      });
      idsToDelete.push(...batchLeads.map((l) => l.id));
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete sequence enrollments for these leads first
      await tx.sequenceEnrollment.deleteMany({
        where: { leadId: { in: idsToDelete } },
      });

      // 2. Delete the leads
      const deleted = await tx.lead.deleteMany({
        where: {
          id: { in: idsToDelete },
          tenantId: tenantContext.tenantId,
        },
      });

      return deleted.count;
    });

    return NextResponse.json({ success: true, count: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
