"use client";

interface MailboxHealthCardProps {
  mailboxEmail: string;
  dailySendCount: number;
  dailyLimit?: number;
  onOpenTestModal: () => void;
}

export function MailboxHealthCard({
  mailboxEmail,
  dailySendCount,
  dailyLimit = 50,
  onOpenTestModal,
}: MailboxHealthCardProps) {
  const percentage = Math.min(100, Math.round((dailySendCount / dailyLimit) * 100));

  return (
    <section aria-labelledby="mailbox-health-heading" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="mailbox-health-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Sending Mailbox Health
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {mailboxEmail}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenTestModal}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          Send Test Email
        </button>
      </div>

      {/* Daily Quota Progress Bar */}
      <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-900">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            Daily Safe Quota
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {dailySendCount} / {dailyLimit} emails sent today
          </span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentage >= 90
                ? "bg-amber-500"
                : "bg-zinc-900 dark:bg-zinc-100"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>Staggered sending active (2–5 min delays)</span>
          <span>Resets at midnight UTC</span>
        </div>
      </div>
    </section>
  );
}
