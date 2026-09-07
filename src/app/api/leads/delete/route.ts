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
    const { leadId, batchId } = body;

    if (!leadId && !batchId) {
      return NextResponse.json(
        { error: "Provide either leadId or batchId to delete." },
        { status: 400 },
      );
    }

    if (leadId) {
      const deleted = await prisma.lead.deleteMany({
        where: {
          id: leadId,
          tenantId: tenantContext.tenantId,
        },
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    if (batchId) {
      const deleted = await prisma.lead.deleteMany({
        where: {
          importBatchId: batchId,
          tenantId: tenantContext.tenantId,
        },
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
