import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InlineStepper } from "@/components/onboarding/InlineStepper";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{
    connected?: string;
    mailbox?: string;
    auth_error?: string;
  }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const authError = params.auth_error;

  const connection = await prisma.mailboxConnection
    .findFirst({ where: { status: "connected" } })
    .catch(() => null);

  // If connected and no error, go straight to the authenticated dashboard
  if (connection && !authError) {
    redirect("/dashboard");
  }

  const connected = params.connected === "1" || connection !== null;

  return (
    <InlineStepper
      connected={connected}
      mailbox={params.mailbox ?? connection?.msAccountEmail}
      authError={authError}
    />
  );
}