import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

interface RawLeadInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  customFields?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getCurrentTenant();
    if (!tenantContext) {
      return NextResponse.json(
        { error: "No active connected mailbox or tenant found. Please log in first." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const rawLeads: RawLeadInput[] = body.leads;

    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return NextResponse.json(
        { error: "No lead records provided in the request payload." },
        { status: 400 },
      );
    }

    // Email regex validation & in-batch deduplication
    const seenInBatch = new Set<string>();
    const validLeads: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      customFields?: Record<string, unknown>;
    }> = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const item of rawLeads) {
      if (!item.email || typeof item.email !== "string") continue;
      const normalizedEmail = item.email.trim().toLowerCase();

      if (!emailRegex.test(normalizedEmail)) continue;
      if (seenInBatch.has(normalizedEmail)) continue;

      seenInBatch.add(normalizedEmail);
      validLeads.push({
        email: normalizedEmail,
        firstName: item.firstName?.trim() || undefined,
        lastName: item.lastName?.trim() || undefined,
        company: item.company?.trim() || undefined,
        customFields: item.customFields,
      });
    }

    if (validLeads.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses were found in the uploaded file." },
        { status: 400 },
      );
    }

    // Check existing database records for tenant-level deduplication
    const emailsToCheck = validLeads.map((l) => l.email);
    const existingLeads = await prisma.lead.findMany({
      where: {
        tenantId: tenantContext.tenantId,
        email: { in: emailsToCheck },
      },
      select: { email: true },
    });

    const existingEmailSet = new Set(existingLeads.map((l) => l.email.toLowerCase()));

    const importBatchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newLeadsToInsert = validLeads
      .filter((l) => !existingEmailSet.has(l.email))
      .map((l) => ({
        tenantId: tenantContext.tenantId,
        email: l.email,
        firstName: l.firstName ?? null,
        lastName: l.lastName ?? null,
        company: l.company ?? null,
        customFields: l.customFields ? (l.customFields as Prisma.InputJsonValue) : undefined,
        importBatchId,
        status: "active",
      }));

    if (newLeadsToInsert.length > 0) {
      await prisma.lead.createMany({
        data: newLeadsToInsert,
        skipDuplicates: true,
      });
    }

    const skippedDuplicates = validLeads.length - newLeadsToInsert.length;

    return NextResponse.json({
      success: true,
      importedCount: newLeadsToInsert.length,
      skippedCount: skippedDuplicates,
      totalBatchRows: rawLeads.length,
      batchId: importBatchId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
