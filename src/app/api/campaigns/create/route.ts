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
    const name = body.name?.trim() || "Untitled Outreach Campaign";

    // Create Campaign with initial sequence and step 1
    const campaign = await prisma.campaign.create({
      data: {
        tenantId: tenantContext.tenantId,
        mailboxConnectionId: tenantContext.connectionId,
        name,
        status: "draft",
        sequence: {
          create: {
            steps: {
              create: {
                stepOrder: 1,
                delayDays: 0,
                subjectTemplate: "{{RANDOM | Quick question | Quick note | Checking in}} for {{firstName | there}}",
                bodyTemplate:
                  "{{RANDOM | Hi | Hello | Hey}} {{firstName | there}},\n\nI noticed your recent work at {{company | your company}} and wanted to see if you would be open to a brief conversation this week.\n\nBest,\n{{RANDOM | Cheers | Thanks | Regards}}",
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, campaignId: campaign.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
