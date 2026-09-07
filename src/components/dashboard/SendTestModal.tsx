"use client";

import { useState, useEffect, useCallback } from "react";

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderEmail: string;
  onSendSuccess: (newCount: number) => void;
}

export function SendTestModal({
  isOpen,
  onClose,
  senderEmail,
  onSendSuccess,
}: SendTestModalProps) {
  const [toEmail, setToEmail] = useState(senderEmail);
  const [subject, setSubject] = useState("Test Email from Outreach Scheduler");
  const [bodyText, setBodyText] = useState(
    "Hello! This test confirms that your Outlook sending pipeline is working properly via Microsoft Graph.",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    sentTo: string;
    isDemo: boolean;
  } | null>(null);

  // Sync recipient when senderEmail changes
  useEffect(() => {
    if (senderEmail && !toEmail) {
      setToEmail(senderEmail);
    }
  }, [senderEmail, toEmail]);

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/mail/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, subject, bodyText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSuccessResult({
        sentTo: data.sentTo,
        isDemo: data.isDemo,
      });

      if (typeof data.dailySendCount === "number") {
        onSendSuccess(data.dailySendCount);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected error while sending",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Send a test email
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Verify your sending pipeline by delivering a real test message from your connected Outlook mailbox.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success Feedback */}
        {successResult && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <p className="font-semibold">Test email dispatched successfully!</p>
            <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
              Delivered to <span className="font-mono font-medium">{successResult.sentTo}</span>.
              {successResult.isDemo && " (Simulated dispatch for Demo Account)"}
            </p>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">Dispatch failed</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="toEmail"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Recipient email
            </label>
            <input
              id="toEmail"
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Subject line
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="bodyText"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Message body
            </label>
            <textarea
              id="bodyText"
              rows={3}
              required
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {successResult ? "Close" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Test Email</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
