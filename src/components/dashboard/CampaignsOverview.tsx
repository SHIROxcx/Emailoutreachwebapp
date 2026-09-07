"use client";

import { useState } from "react";
import Link from "next/link";

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

  const activeCount = campaigns.filter((c) => c.status === "active").length;

  const handleToggleStatus = async (campaignId: string) => {
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
      // Keep state on error
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 3 Metric Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Active Campaigns
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {activeCount}
          </p>
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
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <h2 id="campaigns-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Campaigns
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Manage your outreach sequences and delivery status.
            </p>
          </div>

          <Link
            href="/dashboard/campaigns/new"
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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

        {campaigns.length === 0 ? (
          /* Intentional Empty State */
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
          /* Campaigns Table */
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
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        disabled={togglingId === c.id}
                        onClick={() => handleToggleStatus(c.id)}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {c.status === "active" ? "Pause" : "Resume"}
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
