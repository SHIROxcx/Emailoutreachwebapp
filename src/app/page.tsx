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

  const connection = await prisma.mailboxConnection.findFirst().catch(() => null);

  const connected = params.connected === "1" || connection !== null;
  const authError = params.auth_error;

  return (
    <InlineStepper
      connected={connected}
      mailbox={params.mailbox}
      authError={authError}
    />
  );
}