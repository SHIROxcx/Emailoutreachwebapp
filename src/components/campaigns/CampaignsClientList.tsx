"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface CampaignSummaryItem {
  id: string;
  name: string;
  status: string;
  mailboxEmail: string;
  stepCount: number;
  enrolledCount: number;
  sentCount: number;
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

  const handleToggleStatus = async (campaignId: string) => {
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

  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <section aria-label="Campaigns list" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {campaigns.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No campaigns created yet
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Create an automated follow-up sequence with merge tags and spintax variations.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Create Your First Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500">
                  <th className="pb-3 font-normal">Campaign Name</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal">Steps</th>
                  <th className="pb-3 font-normal">Enrolled</th>
                  <th className="pb-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {campaigns.map((c) => (
                  <tr key={c.id} className="text-zinc-700 dark:text-zinc-300">
                    <td className="py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          c.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono">{c.stepCount} steps</td>
                    <td className="py-3.5 font-mono">{c.enrolledCount}</td>
                    <td className="py-3.5 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
        )}
      </section>
    </div>
  );
}
