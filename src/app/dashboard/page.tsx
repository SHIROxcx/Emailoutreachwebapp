import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { CampaignItem } from "@/components/dashboard/CampaignsOverview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const connection = await prisma.mailboxConnection.findFirst({
    where: { status: "connected" },
  });

  if (!connection) {
    redirect("/");
  }

  // Fetch metrics and campaigns
  const [totalLeadsCount, totalSentCount, campaignsRaw] = await Promise.all([
    prisma.lead.count().catch(() => 0),
    prisma.sendLog.count({ where: { status: "sent" } }).catch(() => 0),
    prisma.campaign.findMany({
      include: {
        enrollments: {
          select: { id: true, status: true },
        },
      },
      orderBy: { id: "desc" },
    }).catch(() => []),
  ]);

  const campaigns: CampaignItem[] = campaignsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    mailboxConnectionId: c.mailboxConnectionId,
    enrolledCount: c.enrollments.length,
    sentCount: c.enrollments.filter((e) => e.status === "completed").length,
    createdAt: new Date().toISOString(),
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardNav mailboxEmail={connection.msAccountEmail} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <DashboardView
          mailboxEmail={connection.msAccountEmail}
          initialDailySendCount={connection.dailySendCount}
          initialCampaigns={campaigns}
          totalLeadsCount={totalLeadsCount}
          totalSentCount={totalSentCount}
        />
      </main>
    </div>
  );
}
