import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LeadsTable, LeadItem } from "@/components/leads/LeadsTable";
import { getCurrentTenant } from "@/lib/current-tenant";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const tenantContext = await getCurrentTenant();

  if (!tenantContext) {
    redirect("/");
  }

  const [rawLeads, campaigns] = await Promise.all([
    prisma.lead
      .findMany({
        where: { tenantId: tenantContext.tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
      .catch(() => []),
    prisma.campaign
      .findMany({
        where: { tenantId: tenantContext.tenantId },
        select: { id: true, name: true, status: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
  ]);

  const leads: LeadItem[] = rawLeads.map((l) => ({
    id: l.id,
    email: l.email,
    firstName: l.firstName,
    lastName: l.lastName,
    company: l.company,
    status: l.status,
    importBatchId: l.importBatchId,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DashboardNav mailboxEmail={tenantContext.mailboxEmail} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <LeadsTable
          initialLeads={leads}
          campaigns={campaigns}
          mailboxEmail={tenantContext.mailboxEmail}
        />
      </main>
    </div>
  );
}
