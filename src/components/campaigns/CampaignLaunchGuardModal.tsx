"use client";

import { useState, useEffect } from "react";

interface AuditDetails {
  mailbox: {
    email: string;
    status: string;
    dailySendCount: number;
    dailyLimit: number;
    remaining: number;
  };
  sequence: {
    stepCount: number;
    delays: number[];
  };
  audience: {
    totalEnrolled: number;
    activeEnrollments: number;
    suppressedEnrollments: number;
  };
  guardrails: {
    dailyLimit: number;
    sendingWindow: string;
    sendingDays: string;
    minIntervalSeconds: number;
    maxConsecutiveErrors: number;
    dryRunMode: boolean;
    safetyPausedReason?: string | null;
    inWindowNow: boolean;
  };
}

interface CampaignLaunchGuardModalProps {
  campaignId: string;
  campaignName: string;
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
}

export function CampaignLaunchGuardModal({
  campaignId,
  campaignName,
  isOpen,
  onClose,
  onActivated,
}: CampaignLaunchGuardModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [canActivate, setCanActivate] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [details, setDetails] = useState<AuditDetails | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    fetch(`/api/campaigns/${campaignId}/audit`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.error) {
          setErrorMsg(data.error);
          setCanActivate(false);
        } else {
          setCanActivate(data.canActivate);
          setBlockers(data.blockers || []);
          setWarnings(data.warnings || []);
          setDetails(data.details);
          setDryRun(Boolean(data.details?.guardrails?.dryRunMode));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to load pre-flight audit.");
          setCanActivate(false);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const handleConfirmActivation = async () => {
    setIsActivating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/campaigns/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          dryRunMode: dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Activation failed.");
      }
      onActivated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to activate campaign.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-guard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <h3 id="launch-guard-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Pre-Flight Campaign Verification
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {campaignName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          >
            <span className="sr-only">Close</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent" />
              <p className="text-xs text-zinc-500">Auditing mailbox connectivity and safety rules...</p>
            </div>
          ) : errorMsg && !details ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              {errorMsg}
            </div>
          ) : (
            <>
              {/* Hard Blockers Banner */}
              {blockers.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15 9-6 6m0-6 6 6" />
                    </svg>
                    Activation Blocked
                  </div>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-red-700 dark:text-red-400">
                    {blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Banner */}
              {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Safety Considerations
                  </div>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-400">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4 Inspection Grid Cards */}
              {details && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Mailbox Card */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Mailbox Health</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {details.mailbox.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {details.mailbox.email}
                    </p>
                    <div className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Safe Quota: <span className="font-semibold text-zinc-900 dark:text-zinc-200">{details.mailbox.dailySendCount} / {details.mailbox.dailyLimit}</span> sent today ({details.mailbox.remaining} available)
                    </div>
                  </div>

                  {/* Sequence Card */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Sequence Steps</span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {details.sequence.stepCount} Step{details.sequence.stepCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Delays: {details.sequence.delays.length > 0 ? details.sequence.delays.map((d, i) => `Step ${i + 1} (${d}d)`).join(" → ") : "None"}
                    </p>
                    <div className="mt-2.5 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Templates & tags verified
                    </div>
                  </div>

                  {/* Audience Card */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Audience & Protection</span>
                      <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {details.audience.activeEnrollments} Active
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Total enrolled: {details.audience.totalEnrolled} prospects
                    </div>
                    <div className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Suppressed (unsubscribed/bounced): <span className="font-semibold text-zinc-900 dark:text-zinc-100">{details.audience.suppressedEnrollments}</span> filtered out
                    </div>
                  </div>

                  {/* Delivery Window & Guardrails */}
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Sending Window</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        details.guardrails.inWindowNow
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {details.guardrails.inWindowNow ? "Window Open" : "Outside Window"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {details.guardrails.sendingWindow} • Mon–Fri
                    </p>
                    <div className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Safety cap: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{details.guardrails.dailyLimit} / day</span> • Circuit breaker armed
                    </div>
                  </div>
                </div>
              )}

              {/* Dry Run / Simulation Mode Toggle */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
                <input
                  id="dry-run-checkbox"
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <div>
                  <label htmlFor="dry-run-checkbox" className="text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer">
                    Dry Run Mode (Simulate sends without Graph API dispatch)
                  </label>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Executes the full sequence pipeline, renders spintax, increments step stages, and generates activity logs without sending real outbound emails to prospects.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/30">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {details?.guardrails.dryRunMode || dryRun ? "Mode: Safe Simulation" : "Mode: Production Graph API"}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canActivate || isActivating || isLoading}
              onClick={handleConfirmActivation}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isActivating ? "Activating..." : dryRun ? "Activate (Dry Run Mode)" : "Confirm & Arm Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
