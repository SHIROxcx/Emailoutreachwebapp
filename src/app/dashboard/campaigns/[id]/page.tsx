import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { CampaignStudio } from "@/components/campaigns/CampaignStudio";

export const dynamic = "force-dynamic";

interface CampaignStudioPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignStudioPage({
  params,
}: CampaignStudioPageProps) {
  const { id } = await params;
  const tenantContext = await getCurrentTenant();
  if (!tenantContext) {
    redirect("/");
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId: tenantContext.tenantId },
    include: {
      mailboxConnection: {
        select: { msAccountEmail: true },
      },
      sequence: {
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      },
      enrollments: {
        include: {
          lead: true,
        },
        orderBy: { nextSendAt: "asc" },
      },
    },
  });

  if (!campaign) {
    redirect("/dashboard/campaigns");
  }

  // Load sample leads for the preview tool
  const sampleLeads = await prisma.lead.findMany({
    where: { tenantId: tenantContext.tenantId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      company: true,
    },
    take: 10,
  }).catch(() => []);

  // Compute available import batches
  const batchesGrouped = await prisma.lead.groupBy({
    by: ["importBatchId"],
    where: {
      tenantId: tenantContext.tenantId,
      importBatchId: { not: null },
    },
    _count: { id: true },
  }).catch(() => []);

  const availableBatches = batchesGrouped
    .filter((b) => b.importBatchId !== null)
    .map((b) => ({
      id: b.importBatchId as string,
      count: b._count.id,
    }));

  const enrolledLeads = campaign.enrollments.map((e) => ({
    id: e.id,
    leadId: e.leadId,
    email: e.lead.email,
    firstName: e.lead.firstName,
    lastName: e.lead.lastName,
    company: e.lead.company,
    status: e.status,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardNav mailboxEmail={tenantContext.mailboxEmail} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <CampaignStudio
          campaign={{
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            mailboxConnection: campaign.mailboxConnection,
            sequence: campaign.sequence,
          }}
          sampleLeads={sampleLeads}
          enrolledLeads={enrolledLeads}
          availableBatches={availableBatches}
        />
      </main>
    </div>
  );
}
