import { prisma } from "@/lib/prisma";

export async function upsertDemoUser(email: string): Promise<{
  id: string;
  tenantId: string;
}> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { id: existing.id, tenantId: existing.tenantId };
  }

  const tenant =
    (await prisma.tenant.findFirst({ where: { name: "Demo Tenant" } })) ??
    (await prisma.tenant.create({ data: { name: "Demo Tenant" } }));

  const user = await prisma.user.create({
    data: { tenantId: tenant.id, email },
  });

  return { id: user.id, tenantId: user.tenantId };
}