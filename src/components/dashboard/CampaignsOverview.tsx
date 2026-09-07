"use client";

import { useState } from "react";
import Link from "next/link";
import { CampaignLaunchGuardModal } from "@/components/campaigns/CampaignLaunchGuardModal";

export interface CampaignItem {
  id: string;
  name: string;
  status: string; // draft | active | paused | done
  mailboxConnectionId: string;
  enrolledCount: number;
  sentCount: number;
  createdAt: string;
}

interface CampaignsOverviewProps {
  initialCampaigns: CampaignItem[];
  totalLeadsCount: number;
  totalSentCount: number;
}

export function CampaignsOverview({
  initialCampaigns,
  totalLeadsCount,
  totalSentCount,
}: CampaignsOverviewProps) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Safety guardrail states
  const [guardModalCampaign, setGuardModalCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [isRunningDispatch, setIsRunningDispatch] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeCount = campaigns.filter((c) => c.status === "active").length;

  const handleStatusAction = (campaign: CampaignItem) => {
    if (campaign.status === "active") {
      // Direct pause
      handleDirectToggle(campaign.id);
    } else {
      // Intercept activation with Pre-Flight Audit Modal
      setGuardModalCampaign({ id: campaign.id, name: campaign.name });
    }
  };

  const handleDirectToggle = async (campaignId: string) => {
    setTogglingId(campaignId);
    try {
      const res = await fetch("/api/campaigns/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.newStatus) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId ? { ...c, status: data.newStatus } : c,
          ),
        );
      }
    } catch {
      // Retain state
    } finally {
      setTogglingId(null);
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm("EMERGENCY STOP: Are you sure you want to pause ALL active campaigns and halts all sending immediately?")) {
      return;
    }

    setIsEmergencyStopping(true);
    setActionNotice(null);
    try {
      const res = await fetch("/api/campaigns/emergency-stop", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.status === "active" ? { ...c, status: "paused" } : c)),
        );
        setActionNotice(data.message || "Emergency Stop activated: all sending paused.");
      }
    } catch {
      setActionNotice("Emergency stop request failed.");
    } finally {
      setIsEmergencyStopping(false);
    }
  };

  const handleRunDispatch = async () => {
    setIsRunningDispatch(true);
    setActionNotice(null);
    try {
      const res = await fetch("/api/worker/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fastForwardDays: 0, ignoreWindowForTesting: true }),
      });
      const data = await res.json();
      if (res.ok && data.stats) {
        const s = data.stats;
        let msg = `Dispatch run: ${s.sent} sent, ${s.advanced} advanced.`;
        if (s.skippedQuota > 0) msg += ` (${s.skippedQuota} daily quota hold)`;
        if (s.circuitBreakersTripped?.length > 0) msg += ` [Tripped: ${s.circuitBreakersTripped.join(", ")}]`;
        setActionNotice(msg);
      } else {
        setActionNotice(data.error || "Dispatch run failed.");
      }
    } catch {
      setActionNotice("Dispatch run failed.");
    } finally {
      setIsRunningDispatch(false);
      setTimeout(() => setActionNotice(null), 8000);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? All sequence steps and enrollments will be permanently removed.")) {
      return;
    }

    setDeletingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      }
    } catch {
      // Retain state
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3 Metric Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Active Campaigns
          </p>
          <div className="flex items-baseline justify-between">
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {activeCount}
            </p>
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sending Active
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Leads Enrolled
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {totalLeadsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total Sends Completed
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {totalSentCount}
          </p>
        </div>
      </div>

      {/* Campaigns Section */}
      <section aria-labelledby="campaigns-heading" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <h2 id="campaigns-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Campaigns
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Manage your outreach sequences and automated safety guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Emergency Stop Button */}
            {activeCount > 0 && (
              <button
                type="button"
                disabled={isEmergencyStopping}
                onClick={handleEmergencyStop}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors shadow-sm"
                title="Pause all active campaigns immediately"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span>{isEmergencyStopping ? "Halting..." : "Emergency Stop"}</span>
              </button>
            )}

            {/* Run Dispatch Pass */}
            <button
              type="button"
              disabled={isRunningDispatch}
              onClick={handleRunDispatch}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
              title="Run dispatch pass for due sends"
            >
              <svg className={`h-3.5 w-3.5 ${isRunningDispatch ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>{isRunningDispatch ? "Dispatching..." : "Run Dispatch"}</span>
            </button>

            <Link
              href="/dashboard/campaigns/new"
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Campaign
            </Link>
          </div>
        </div>

        {campaigns.length === 0 ? (
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
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No outreach campaigns yet
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Start by uploading your prospect list as a CSV or creating an outreach sequence with automated follow-ups.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href="/dashboard/leads"
                className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Upload Leads
              </Link>
              <Link
                href="/dashboard/campaigns/new"
                className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Create Campaign
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 font-medium">
                  <th className="pb-3 font-normal">Campaign Name</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal">Enrolled</th>
                  <th className="pb-3 font-normal">Sent</th>
                  <th className="pb-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {campaigns.map((c) => (
                  <tr key={c.id} className="text-zinc-700 dark:text-zinc-300">
                    <td className="py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {c.name}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          c.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : c.status === "paused"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono">{c.enrolledCount}</td>
                    <td className="py-3.5 font-mono">{c.sentCount}</td>
                    <td className="py-3.5 text-right space-x-3">
                      <button
                        type="button"
                        disabled={togglingId === c.id}
                        onClick={() => handleStatusAction(c)}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {c.status === "active" ? "Pause" : "Resume"}
                      </button>
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        Edit →
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pre-Flight Audit Modal for Overview */}
      {guardModalCampaign && (
        <CampaignLaunchGuardModal
          campaignId={guardModalCampaign.id}
          campaignName={guardModalCampaign.name}
          isOpen={Boolean(guardModalCampaign)}
          onClose={() => setGuardModalCampaign(null)}
          onActivated={() => {
            setCampaigns((prev) =>
              prev.map((c) =>
                c.id === guardModalCampaign.id ? { ...c, status: "active" } : c,
              ),
            );
            setGuardModalCampaign(null);
          }}
        />
      )}
    </div>
  );
}
