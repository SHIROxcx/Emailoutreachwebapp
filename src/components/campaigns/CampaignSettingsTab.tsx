"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignSettingsTabProps {
  campaignId: string;
  initialName: string;
  mailboxEmail: string;
}

export function CampaignSettingsTab({
  campaignId,
  initialName,
  mailboxEmail,
}: CampaignSettingsTabProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, steps: [] }),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch {
      // Error handling
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!confirm("Are you sure you want to delete this campaign and all its sequence steps?")) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/campaigns");
      }
    } catch {
      // Error
    }
  };

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <section aria-label="General Settings" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Campaign Settings
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Configure title and sending credentials for this outreach sequence.
        </p>

        <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Sending Mailbox
            </label>
            <input
              type="text"
              disabled
              value={mailboxEmail}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Connected via Microsoft Graph with automated staggered pauses.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            {isSaved && (
              <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
            )}
          </div>
        </form>
      </section>

      {/* Danger Zone */}
      <section aria-label="Danger Zone" className="rounded-2xl border border-red-200 bg-red-50/40 p-6 dark:border-red-900/60 dark:bg-red-950/20">
        <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">
          Delete Campaign
        </h4>
        <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
          Permanently delete this campaign, its sequence steps, and all prospect enrollments.
        </p>
        <button
          type="button"
          onClick={handleDeleteCampaign}
          className="mt-4 rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
        >
          Delete Campaign
        </button>
      </section>
    </div>
  );
}
