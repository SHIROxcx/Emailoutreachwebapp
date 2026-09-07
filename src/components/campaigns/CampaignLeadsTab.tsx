"use client";

import { useState } from "react";

export interface EnrolledLeadItem {
  id: string;
  leadId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  status: string; // active | paused | completed | bounced
  currentStepOrder?: number;
}

interface BatchOption {
  id: string;
  count: number;
}

interface CampaignLeadsTabProps {
  campaignId: string;
  enrolledLeads: EnrolledLeadItem[];
  availableBatches: BatchOption[];
  onEnrollSuccess: () => void;
}

export function CampaignLeadsTab({
  campaignId,
  enrolledLeads,
  availableBatches,
  onEnrollSuccess,
}: CampaignLeadsTabProps) {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [feedback, setFeedback] = useState<{ count: number; skipped: number } | null>(null);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selectedBatch || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ count: data.enrolledCount, skipped: data.skippedCount });
        onEnrollSuccess();
      }
    } catch {
      // Error handling
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Batch Enrollment Card */}
      <section aria-label="Batch enrollment" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Enroll Leads from CSV Imports
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Assign prospect batches uploaded in Phase 4 to this sequence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 font-mono"
            >
              <option value="">Enroll All Available Leads</option>
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} ({b.count} contacts)
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isEnrolling}
              onClick={handleEnroll}
              className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isEnrolling ? "Enrolling..." : "Enroll Cohort"}
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            ✓ Successfully enrolled <strong>{feedback.count}</strong> prospects into this sequence.
            {feedback.skipped > 0 && ` (${feedback.skipped} already enrolled leads skipped)`}
          </div>
        )}
      </section>

      {/* Enrolled Leads Table */}
      <section aria-label="Enrolled contacts" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Enrolled Contacts ({enrolledLeads.length})
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Prospects currently queued or receiving emails from this sequence.
            </p>
          </div>
        </div>

        {enrolledLeads.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No contacts are currently enrolled in this sequence. Use the tool above to enroll your first lead cohort.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500">
                  <th className="pb-3 font-normal">Contact</th>
                  <th className="pb-3 font-normal">Company</th>
                  <th className="pb-3 font-normal">Current Stage</th>
                  <th className="pb-3 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {enrolledLeads.map((item) => (
                  <tr key={item.id} className="text-zinc-700 dark:text-zinc-300">
                    <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      <p>{item.email}</p>
                      {item.firstName && (
                        <p className="text-[11px] font-normal text-zinc-500">
                          {item.firstName} {item.lastName || ""}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {item.company || "—"}
                    </td>
                    <td className="py-3 text-[11px] text-zinc-500 font-mono">
                      {item.currentStepOrder ? `Step ${item.currentStepOrder}` : "Queued (Step 1)"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 capitalize">
                        {item.status}
                      </span>
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
