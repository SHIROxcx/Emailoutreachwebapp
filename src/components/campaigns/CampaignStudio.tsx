"use client";

import { useState } from "react";
import Link from "next/link";
import { SequenceBuilder, SequenceStepData } from "./SequenceBuilder";
import { CampaignLeadsTab, EnrolledLeadItem } from "./CampaignLeadsTab";
import { CampaignSettingsTab, CampaignSafetySettings } from "./CampaignSettingsTab";
import { CampaignLaunchGuardModal } from "./CampaignLaunchGuardModal";

interface CampaignStudioProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    dailyLimit?: number;
    sendingWindowStart?: string;
    sendingWindowEnd?: string;
    sendingDays?: string;
    minIntervalSeconds?: number;
    maxConsecutiveErrors?: number;
    dryRunMode?: boolean;
    safetyPausedReason?: string | null;
    mailboxConnection: {
      msAccountEmail: string;
    };
    sequence?: {
      steps: SequenceStepData[];
    } | null;
  };
  sampleLeads: Array<{
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  }>;
  enrolledLeads: EnrolledLeadItem[];
  availableBatches: Array<{ id: string; count: number }>;
}

type TabType = "sequence" | "leads" | "settings";

export function CampaignStudio({
  campaign,
  sampleLeads,
  enrolledLeads,
  availableBatches,
}: CampaignStudioProps) {
  const [activeTab, setActiveTab] = useState<TabType>("sequence");
  const [status, setStatus] = useState(campaign.status);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
  const [safetyReason, setSafetyReason] = useState(campaign.safetyPausedReason);

  // Dispatch runner state
  const [isRunningDispatch, setIsRunningDispatch] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  const handleStatusButtonClick = () => {
    if (status === "active") {
      // Direct pause
      handleDirectPause();
    } else {
      // Opening guardrail pre-flight audit modal before activation
      setIsGuardModalOpen(true);
    }
  };

  const handleDirectPause = async () => {
    setIsTogglingStatus(true);
    try {
      const res = await fetch("/api/campaigns/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await res.json();
      if (res.ok && data.newStatus) {
        setStatus(data.newStatus);
      }
    } catch {
      // Retain status on error
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleRunDispatchPass = async () => {
    setIsRunningDispatch(true);
    setDispatchFeedback(null);
    try {
      const res = await fetch("/api/worker/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fastForwardDays: 0, ignoreWindowForTesting: true }),
      });
      const data = await res.json();
      if (res.ok && data.stats) {
        const s = data.stats;
        let msg = `Dispatch finished: ${s.sent} sent, ${s.advanced} advanced, ${s.completed} completed.`;
        if (s.skippedQuota > 0) msg += ` (${s.skippedQuota} held by daily limit)`;
        if (s.skippedSuppression > 0) msg += ` (${s.skippedSuppression} suppressed)`;
        if (s.circuitBreakersTripped?.length > 0) msg += ` [Circuit breaker tripped: ${s.circuitBreakersTripped.join(", ")}]`;
        setDispatchFeedback(msg);
      } else {
        setDispatchFeedback(data.error || "Dispatch failed.");
      }
    } catch {
      setDispatchFeedback("Dispatch request failed.");
    } finally {
      setIsRunningDispatch(false);
      setTimeout(() => setDispatchFeedback(null), 7000);
    }
  };

  const steps = campaign.sequence?.steps || [];

  const safetySettings: CampaignSafetySettings = {
    dailyLimit: campaign.dailyLimit,
    sendingWindowStart: campaign.sendingWindowStart,
    sendingWindowEnd: campaign.sendingWindowEnd,
    sendingDays: campaign.sendingDays,
    minIntervalSeconds: campaign.minIntervalSeconds,
    maxConsecutiveErrors: campaign.maxConsecutiveErrors,
    dryRunMode: campaign.dryRunMode,
    safetyPausedReason: safetyReason,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
            title="Back to campaigns"
          >
            <svg className="h-4 w-4 text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {campaign.name}
              </h1>
              {campaign.dryRunMode && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Dry Run Simulation
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              From: {campaign.mailboxConnection.msAccountEmail}
            </p>
          </div>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Dispatch Trigger */}
          <button
            type="button"
            disabled={isRunningDispatch}
            onClick={handleRunDispatchPass}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
            title="Execute due sequence sends immediately"
          >
            <svg className={`h-3.5 w-3.5 ${isRunningDispatch ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>{isRunningDispatch ? "Dispatching..." : "Run Dispatch Pass"}</span>
          </button>

          {/* Status Control Button */}
          <button
            type="button"
            disabled={isTogglingStatus}
            onClick={handleStatusButtonClick}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors shadow-sm ${
              status === "active"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "active" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
            />
            <span>{status === "active" ? "Campaign Active (Pause)" : "Draft / Paused (Activate)"}</span>
          </button>
        </div>
      </div>

      {/* Dispatch Telemetry Notification */}
      {dispatchFeedback && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 animate-in fade-in flex items-center justify-between">
          <span>{dispatchFeedback}</span>
          <button
            type="button"
            onClick={() => setDispatchFeedback(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Circuit Breaker Alert Banner */}
      {safetyReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Circuit Breaker Triggered
            </h4>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              {safetyReason}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSafetyReason(null)}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300"
          >
            Clear Alert
          </button>
        </div>
      )}

      {/* 3-Tab Navigator */}
      <div
        role="tablist"
        aria-label="Campaign sections"
        className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "sequence"}
          onClick={() => setActiveTab("sequence")}
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "sequence"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Sequences ({steps.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "leads"}
          onClick={() => setActiveTab("leads")}
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "leads"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Leads ({enrolledLeads.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "settings"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          Settings & Guardrails
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "sequence" && (
          <SequenceBuilder
            campaignId={campaign.id}
            initialSteps={steps}
            sampleLeads={sampleLeads}
          />
        )}

        {activeTab === "leads" && (
          <CampaignLeadsTab
            campaignId={campaign.id}
            enrolledLeads={enrolledLeads}
            availableBatches={availableBatches}
            onEnrollSuccess={() => {
              window.location.reload();
            }}
          />
        )}

        {activeTab === "settings" && (
          <CampaignSettingsTab
            campaignId={campaign.id}
            initialName={campaign.name}
            mailboxEmail={campaign.mailboxConnection.msAccountEmail}
            initialSafetySettings={safetySettings}
          />
        )}
      </div>

      {/* Pre-Flight Activation Audit Modal */}
      <CampaignLaunchGuardModal
        campaignId={campaign.id}
        campaignName={campaign.name}
        isOpen={isGuardModalOpen}
        onClose={() => setIsGuardModalOpen(false)}
        onActivated={() => {
          setStatus("active");
          setSafetyReason(null);
        }}
      />
    </div>
  );
}
