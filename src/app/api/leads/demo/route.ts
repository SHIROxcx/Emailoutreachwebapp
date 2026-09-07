import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export const DEMO_PROSPECTS = [
  {
    email: "alex.rivera@techcorp.io",
    firstName: "Alex",
    lastName: "Rivera",
    company: "TechCorp",
    status: "active",
  },
  {
    email: "sarah.chen@cloudscale.net",
    firstName: "Sarah",
    lastName: "Chen",
    company: "CloudScale",
    status: "active",
  },
  {
    email: "marcus.vance@finflow.co",
    firstName: "Marcus",
    lastName: "Vance",
    company: "FinFlow",
    status: "active",
  },
  {
    email: "elena.rostova@dataforge.ai",
    firstName: "Elena",
    lastName: "Rostova",
    company: "DataForge AI",
    status: "active",
  },
  {
    email: "david.kim@hyperlaunch.io",
    firstName: "David",
    lastName: "Kim",
    company: "HyperLaunch",
    status: "active",
  },
  {
    email: "jessica.taylor@apexlogistics.com",
    firstName: "Jessica",
    lastName: "Taylor",
    company: "Apex Logistics",
    status: "active",
  },
  {
    email: "rachel.green@stratahealth.org",
    firstName: "Rachel",
    lastName: "Green",
    company: "Strata Health",
    status: "active",
  },
  {
    email: "liam.oconnor@beaconsecurity.io",
    firstName: "Liam",
    lastName: "O'Connor",
    company: "Beacon Security",
    status: "active",
  },
  {
    email: "maya.patel@nexuscrm.com",
    firstName: "Maya",
    lastName: "Patel",
    company: "Nexus CRM",
    status: "active",
  },
  {
    email: "carlos.mendez@solarsolutions.energy",
    firstName: "Carlos",
    lastName: "Mendez",
    company: "SolarSolutions",
    status: "active",
  },
  {
    email: "hannah.abbott@quantumanalytics.tech",
    firstName: "Hannah",
    lastName: "Abbott",
    company: "Quantum Analytics",
    status: "active",
  },
  {
    email: "monica.geller@kitchencraft.co",
    firstName: "Monica",
    lastName: "Geller",
    company: "KitchenCraft",
    status: "active",
  },
];

export async function POST(_request: NextRequest) {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = tenantContext.tenantId;
    const batchId = `demo_${Date.now()}`;

    // Purge existing leads & their enrollments inside transaction, then seed demo ones
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing sequence enrollments for this tenant's leads
      const existingLeads = await tx.lead.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const leadIds = existingLeads.map((l) => l.id);

      if (leadIds.length > 0) {
        await tx.sequenceEnrollment.deleteMany({
          where: { leadId: { in: leadIds } },
        });
        await tx.lead.deleteMany({
          where: { tenantId },
        });
      }

      // 2. Insert fresh demo prospects
      const created = await tx.lead.createMany({
        data: DEMO_PROSPECTS.map((p) => ({
          tenantId,
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          company: p.company,
          status: p.status,
          importBatchId: batchId,
        })),
      });

      return created.count;
    });

    return NextResponse.json({
      success: true,
      seededCount: result,
      batchId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed demo leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = tenantContext.tenantId;

    const result = await prisma.$transaction(async (tx) => {
      const existingLeads = await tx.lead.findMany({
        where: { tenantId },
        select: { id: true },
      });
      const leadIds = existingLeads.map((l) => l.id);

      if (leadIds.length > 0) {
        await tx.sequenceEnrollment.deleteMany({
          where: { leadId: { in: leadIds } },
        });
        const deleted = await tx.lead.deleteMany({
          where: { tenantId },
        });
        return deleted.count;
      }
      return 0;
    });

    return NextResponse.json({ success: true, deletedCount: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
