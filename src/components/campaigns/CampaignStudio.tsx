"use client";

import { useState } from "react";
import Link from "next/link";
import { SequenceBuilder, SequenceStepData } from "./SequenceBuilder";
import { CampaignLeadsTab, EnrolledLeadItem } from "./CampaignLeadsTab";
import { CampaignSettingsTab } from "./CampaignSettingsTab";

interface CampaignStudioProps {
  campaign: {
    id: string;
    name: string;
    status: string;
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

  const handleToggleStatus = async () => {
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
      // Retain state on error
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const steps = campaign.sequence?.steps || [];

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
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {campaign.name}
            </h1>
            <p className="text-xs text-zinc-500 font-mono">
              From: {campaign.mailboxConnection.msAccountEmail}
            </p>
          </div>
        </div>

        {/* Status Control */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isTogglingStatus}
            onClick={handleToggleStatus}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
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
          Settings
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
          />
        )}
      </div>
    </div>
  );
}
