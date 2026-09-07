import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/current-tenant";
import { processDueSends } from "@/lib/worker/dispatcher";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const fastForwardDays = typeof body.fastForwardDays === "number" ? body.fastForwardDays : undefined;
    const ignoreWindowForTesting = Boolean(body.ignoreWindowForTesting);

    const stats = await processDueSends({
      tenantId: tenantContext.tenantId,
      fastForwardDays,
      ignoreWindowForTesting,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch pass failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
