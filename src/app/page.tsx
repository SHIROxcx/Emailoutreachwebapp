import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Outreach Scheduler
          </h1>
          <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Connect your Outlook, upload leads, build a sequence, and let us
            handle the sending.
          </p>
        </div>

        {authError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">Connection failed</p>
            <p className="mt-1 break-all">{authError}</p>
          </div>
        ) : connected ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <p className="font-medium">Outlook connected</p>
            {params.mailbox ? (
              <p className="mt-1">
                Sending emails as <span className="font-mono">{params.mailbox}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Not connected yet. Connect your personal Microsoft account to start.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/api/auth/microsoft/login"
            className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-5 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Connect Outlook
          </Link>
          {connected ? (
            <Link
              href="/api/auth/microsoft/login"
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Reconnect
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}