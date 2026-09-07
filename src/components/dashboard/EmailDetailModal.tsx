"use client";

import { useEffect, useCallback, useState } from "react";

export interface SendLogItem {
  id: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string | null;
  campaignName: string | null;
  isTest: boolean;
  sentAt: string;
  graphMessageId: string | null;
  status: string; // sent | simulated | failed | retried
}

interface EmailDetailModalProps {
  log: SendLogItem | null;
  mailboxEmail: string;
  onClose: () => void;
}

export function EmailDetailModal({
  log,
  mailboxEmail,
  onClose,
}: EmailDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (log) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [log, handleKeyDown]);

  if (!log) return null;

  const handleCopyRecipient = async () => {
    try {
      await navigator.clipboard.writeText(log.recipientEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const formattedDate = new Date(log.sentAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-900">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                log.status === "sent"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : log.status === "simulated"
                    ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
              }`}
            >
              {log.status === "sent"
                ? "Delivered via Microsoft Graph"
                : log.status === "simulated"
                  ? "Simulated Demo Mode"
                  : "Dispatch Failed"}
            </span>

            {log.isTest ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Test Send
              </span>
            ) : log.campaignName ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {log.campaignName}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Subject Line */}
          <div>
            <h2
              id="email-modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight"
            >
              {log.subject}
            </h2>
          </div>

          {/* Envelope Metadata Grid */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30 text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 dark:text-zinc-500 font-medium w-12">To:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                  {log.recipientEmail}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecipient}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 ml-1 transition-colors"
                  title="Copy email address"
                >
                  {copied ? (
                    <span className="text-emerald-600 text-[10px]">Copied!</span>
                  ) : (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <svg
                  className="h-3.5 w-3.5 text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium w-12">From:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {mailboxEmail}
              </span>
            </div>

            {log.graphMessageId && (
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <span className="text-zinc-400 dark:text-zinc-500 font-medium w-12">Trace:</span>
                <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                  {log.graphMessageId}
                </span>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Rendered Message Body
            </label>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {log.bodyPreview || "No message content recorded."}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-zinc-100 px-6 py-3.5 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
