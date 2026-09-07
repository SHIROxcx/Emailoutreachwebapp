import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { CampaignsClientList } from "@/components/campaigns/CampaignsClientList";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const tenantContext = await getCurrentTenant();
  if (!tenantContext) {
    redirect("/");
  }

  const rawCampaigns = await prisma.campaign.findMany({
    where: { tenantId: tenantContext.tenantId },
    include: {
      sequence: {
        include: {
          steps: {
            select: { id: true },
          },
        },
      },
      enrollments: {
        select: { id: true, status: true },
      },
      mailboxConnection: {
        select: { msAccountEmail: true },
      },
    },
    orderBy: { id: "desc" },
  }).catch(() => []);

  const campaigns = rawCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    mailboxEmail: c.mailboxConnection.msAccountEmail,
    stepCount: c.sequence?.steps.length || 0,
    enrolledCount: c.enrollments.length,
    sentCount: c.enrollments.filter((e) => e.status === "completed").length,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardNav mailboxEmail={tenantContext.mailboxEmail} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <CampaignsClientList initialCampaigns={campaigns} />
      </main>
    </div>
  );
}
