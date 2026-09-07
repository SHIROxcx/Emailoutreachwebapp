"use client";

import { useState } from "react";
import { SendLogItem, EmailDetailModal } from "./EmailDetailModal";

interface ActivityFeedProps {
  logs: SendLogItem[];
  mailboxEmail: string;
  onOpenTestModal?: () => void;
  onRefresh?: () => Promise<void>;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getAvatarInitials(email: string): string {
  const namePart = email.split("@")[0] || "";
  const clean = namePart.replace(/[^a-zA-Z0-9]/g, " ").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return namePart.slice(0, 2).toUpperCase();
}

export function ActivityFeed({
  logs,
  mailboxEmail,
  onOpenTestModal,
  onRefresh,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<"all" | "test" | "campaign">("all");
  const [selectedLog, setSelectedLog] = useState<SendLogItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const testLogsCount = logs.filter((l) => l.isTest).length;
  const campaignLogsCount = logs.filter((l) => !l.isTest).length;

  const filteredLogs = logs.filter((log) => {
    if (filter === "test") return log.isTest;
    if (filter === "campaign") return !log.isTest;
    return true;
  });

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <section
        aria-labelledby="activity-heading"
        className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="activity-heading"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Dispatched Emails
              </h2>
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-mono font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {logs.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Live history of outbound outreach and test messages sent through this mailbox.
            </p>
          </div>

          {/* Controls: Filter Pills & Refresh */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filter === "all"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                All ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("test")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filter === "test"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Test Sends ({testLogsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("campaign")}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  filter === "campaign"
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Campaigns ({campaignLogsCount})
              </button>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh activity logs"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                <svg
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                <path d="M19 16v6" />
                <path d="M22 19l-3 3-3-3" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No dispatched emails yet
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Emails sent via test dispatches or active outreach sequences will appear here with full delivery traces and message previews.
            </p>
            {onOpenTestModal && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={onOpenTestModal}
                  className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Send a Test Email
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 font-medium">
                  <th className="pb-3 font-normal">Recipient</th>
                  <th className="pb-3 font-normal">Subject</th>
                  <th className="pb-3 font-normal">Source</th>
                  <th className="pb-3 font-normal">Dispatched</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                  >
                    {/* Recipient */}
                    <td className="py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {getAvatarInitials(log.recipientEmail)}
                        </span>
                        <span className="font-mono text-xs">{log.recipientEmail}</span>
                      </div>
                    </td>

                    {/* Subject & Preview */}
                    <td className="py-3.5 max-w-xs">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {log.subject}
                      </p>
                      {log.bodyPreview && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                          {log.bodyPreview.replace(/\s+/g, " ")}
                        </p>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3.5">
                      {log.isTest ? (
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Test Send
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 truncate max-w-[140px]">
                          {log.campaignName || "Campaign"}
                        </span>
                      )}
                    </td>

                    {/* Dispatched time */}
                    <td className="py-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <span title={new Date(log.sentAt).toLocaleString()}>
                        {formatRelativeTime(log.sentAt)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          log.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : log.status === "simulated"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {log.status === "sent"
                          ? "Delivered"
                          : log.status === "simulated"
                            ? "Simulated"
                            : "Failed"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <svg
                          className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Email Inspection Modal */}
      <EmailDetailModal
        log={selectedLog}
        mailboxEmail={mailboxEmail}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
}
