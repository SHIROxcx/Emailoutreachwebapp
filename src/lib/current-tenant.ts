import { prisma } from "@/lib/prisma";

export async function getCurrentTenant() {
  const connection = await prisma.mailboxConnection.findFirst({
    where: { status: "connected" },
    include: {
      user: {
        include: { tenant: true },
      },
    },
  });

  if (!connection) {
    return null;
  }

  return {
    tenantId: connection.user.tenantId,
    userId: connection.userId,
    mailboxEmail: connection.msAccountEmail,
    connectionId: connection.id,
  };
}
