"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SendLogItem } from "./EmailDetailModal";
import { renderTemplate } from "@/lib/template-engine";

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderEmail: string;
  initialRecipient?: string;
  initialFirstName?: string;
  initialCompany?: string;
  onSendSuccess: (newCount: number, newLog?: SendLogItem) => void;
}

export function SendTestModal({
  isOpen,
  onClose,
  senderEmail,
  initialRecipient,
  initialFirstName,
  initialCompany,
  onSendSuccess,
}: SendTestModalProps) {
  const [toEmail, setToEmail] = useState(
    initialRecipient || "monteflorian88@gmail.com",
  );
  const [subject, setSubject] = useState("{Quick question|Hello} {{firstName | there}}");
  const [bodyText, setBodyText] = useState(
    "Hi {{firstName | there}},\n\nThis test message confirms your Outlook sending pipeline is properly active for {{company | your organization}} via Microsoft Graph.\n\nBest regards,\nOutreach Scheduler Team",
  );

  // Test Parameter Settings
  const [showSettings, setShowSettings] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName || "Florian");
  const [company, setCompany] = useState(initialCompany || "Acme Corp");
  const [simulationScenario, setSimulationScenario] = useState<
    "normal" | "rate_limit_429" | "server_error_500"
  >("normal");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    sentTo: string;
    isDemo: boolean;
  } | null>(null);

  // Sync recipient and parameters when modal opens with new initial values
  useEffect(() => {
    if (initialRecipient) {
      setToEmail(initialRecipient);
    }
    if (initialFirstName) {
      setFirstName(initialFirstName);
    }
    if (initialCompany) {
      setCompany(initialCompany);
    }
  }, [initialRecipient, initialFirstName, initialCompany]);

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

  // Live preview of resolved parameters
  const preview = useMemo(() => {
    const vars = {
      email: toEmail,
      firstName: firstName.trim() || undefined,
      company: company.trim() || undefined,
    };
    return {
      subject: renderTemplate(subject, vars),
      body: renderTemplate(bodyText, vars),
    };
  }, [subject, bodyText, toEmail, firstName, company]);

  if (!isOpen) return null;

  const handleInsertTag = (tag: string) => {
    setBodyText((prev) => `${prev} ${tag}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/mail/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail,
          subject,
          bodyText,
          mergeVariables: {
            firstName: firstName.trim(),
            company: company.trim(),
          },
          simulationScenario,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.log) {
          onSendSuccess(data.dailySendCount ?? 0, data.log);
        }
        throw new Error(data.error || "Failed to send email");
      }

      setSuccessResult({
        sentTo: data.sentTo,
        isDemo: data.isDemo,
      });

      if (typeof data.dailySendCount === "number") {
        onSendSuccess(data.dailySendCount, data.log);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-lg my-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Send a test email
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Verify your pipeline with custom parameters, merge tags, and simulation scenarios.
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
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 font-mono"
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="bodyText"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Message body
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertTag("{{firstName}}")}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  +&#123;&#123;firstName&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{{company}}")}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  +&#123;&#123;company&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{Option A|Option B}")}
                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  +&#123;Spintax&#125;
                </button>
              </div>
            </div>
            <textarea
              id="bodyText"
              rows={4}
              required
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Test Parameters & Settings Accordion */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/30">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex w-full items-center justify-between text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-zinc-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                  />
                </svg>
                <span>Test Parameters & Settings</span>
                <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {simulationScenario !== "normal" ? "Simulated Scenario" : "Configured"}
                </span>
              </div>
              <svg
                className={`h-4 w-4 text-zinc-400 transition-transform ${
                  showSettings ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showSettings && (
              <div className="mt-3.5 pt-3.5 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Parameter: &#123;&#123;firstName&#125;&#125;
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Florian"
                      className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Parameter: &#123;&#123;company&#125;&#125;
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Delivery Simulation Mode
                  </label>
                  <select
                    value={simulationScenario}
                    onChange={(e) =>
                      setSimulationScenario(
                        e.target.value as "normal" | "rate_limit_429" | "server_error_500",
                      )
                    }
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="normal">Normal Dispatch (Active Pipeline)</option>
                    <option value="rate_limit_429">
                      Simulate Graph 429 (Rate Limit Quota Exceeded)
                    </option>
                    <option value="server_error_500">
                      Simulate Graph 500 (Mail Server Error)
                    </option>
                  </select>
                </div>

                {/* Live Resolved Preview Box */}
                <div className="rounded-lg bg-zinc-100/80 p-2.5 dark:bg-zinc-900/80 text-[11px] space-y-1">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Resolved Output Preview:
                  </div>
                  <div className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
                    {preview.subject}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap truncate">
                    {preview.body.slice(0, 120)}...
                  </div>
                </div>
              </div>
            )}
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
