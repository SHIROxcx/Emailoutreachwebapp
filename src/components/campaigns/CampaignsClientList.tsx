"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignLaunchGuardModal } from "@/components/campaigns/CampaignLaunchGuardModal";

export interface CampaignSummaryItem {
  id: string;
  name: string;
  status: string;
  mailboxEmail: string;
  stepCount: number;
  enrolledCount: number;
  sentCount: number;
  safetyPausedReason?: string | null;
}

interface CampaignsClientListProps {
  initialCampaigns: CampaignSummaryItem[];
}

export function CampaignsClientList({ initialCampaigns }: CampaignsClientListProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Safety guardrail states
  const [guardModalCampaign, setGuardModalCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [isRunningDispatch, setIsRunningDispatch] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeCount = campaigns.filter((c) => c.status === "active").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.campaignId) {
        router.push(`/dashboard/campaigns/${data.campaignId}`);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleStatusClick = (c: CampaignSummaryItem) => {
    if (c.status === "active") {
      handleDirectPause(c.id);
    } else {
      // Intercept activation with Pre-Flight Audit Modal
      setGuardModalCampaign({ id: c.id, name: c.name });
    }
  };

  const handleDirectPause = async (campaignId: string) => {
    try {
      const res = await fetch("/api/campaigns/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (res.ok && data.newStatus) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: data.newStatus } : c)),
        );
      }
    } catch {
      // Error
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
        let msg = `Dispatch run completed: ${s.sent} sent, ${s.advanced} advanced, ${s.completed} completed.`;
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
    if (!confirm("Are you sure you want to delete this campaign? All sequence steps and enrollments will be removed.")) {
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
      // Error
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Outreach Campaigns
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Build multi-step cold email sequences, configure delays, and monitor active enrollments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Emergency Stop Button */}
          {activeCount > 0 && (
            <button
              type="button"
              disabled={isEmergencyStopping}
              onClick={handleEmergencyStop}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors shadow-sm"
              title="Halt all active campaign sends immediately"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>{isEmergencyStopping ? "Halting..." : "Emergency Stop"}</span>
            </button>
          )}

          {/* Quick Dispatch Pass */}
          <button
            type="button"
            disabled={isRunningDispatch}
            onClick={handleRunDispatch}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
            title="Execute due sequence sends"
          >
            <svg className={`h-3.5 w-3.5 ${isRunningDispatch ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>{isRunningDispatch ? "Dispatching..." : "Run Dispatch"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Campaign
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 flex items-center justify-between animate-in fade-in">
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

      {/* Creation Modal */}
      {isCreating && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Create New Campaign
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Give your outreach sequence a name to get started.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Q4 Real Estate Founders Outreach"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={isSubmitting}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCampaignName.trim()}
                  className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {isSubmitting ? "Creating..." : "Create & Edit Sequence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No campaigns found
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Get started by creating your first cold outreach sequence.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Create Campaign
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-400 dark:border-zinc-900 dark:bg-zinc-900/30 dark:text-zinc-500 font-medium">
                <tr>
                  <th className="px-5 py-3 font-normal">Campaign Name</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Steps</th>
                  <th className="px-4 py-3 font-normal">Enrolled</th>
                  <th className="px-5 py-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {c.mailboxEmail}
                      </div>
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-400">
                      {c.stepCount} {c.stepCount === 1 ? "step" : "steps"}
                    </td>
                    <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-400">
                      {c.enrolledCount}
                    </td>
                    <td className="px-5 py-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => handleStatusClick(c)}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                      >
                        {c.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        Edit Sequence →
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
        </div>
      )}

      {/* Pre-Flight Audit Modal */}
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
