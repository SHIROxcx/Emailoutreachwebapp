"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CampaignSafetySettings {
  dailyLimit?: number;
  sendingWindowStart?: string;
  sendingWindowEnd?: string;
  sendingDays?: string;
  minIntervalSeconds?: number;
  maxConsecutiveErrors?: number;
  dryRunMode?: boolean;
  safetyPausedReason?: string | null;
}

interface CampaignSettingsTabProps {
  campaignId: string;
  initialName: string;
  mailboxEmail: string;
  initialSafetySettings?: CampaignSafetySettings;
}

const DAYS_MAP = [
  { num: 1, label: "Mon" },
  { num: 2, label: "Tue" },
  { num: 3, label: "Wed" },
  { num: 4, label: "Thu" },
  { num: 5, label: "Fri" },
  { num: 6, label: "Sat" },
  { num: 7, label: "Sun" },
];

export function CampaignSettingsTab({
  campaignId,
  initialName,
  mailboxEmail,
  initialSafetySettings = {},
}: CampaignSettingsTabProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);

  // Safety settings states
  const [dailyLimit, setDailyLimit] = useState(initialSafetySettings.dailyLimit ?? 30);
  const [windowStart, setWindowStart] = useState(initialSafetySettings.sendingWindowStart ?? "09:00");
  const [windowEnd, setWindowEnd] = useState(initialSafetySettings.sendingWindowEnd ?? "17:00");
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    const raw = initialSafetySettings.sendingDays ?? "1,2,3,4,5";
    return raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  });
  const [minIntervalSeconds, setMinIntervalSeconds] = useState(initialSafetySettings.minIntervalSeconds ?? 60);
  const [maxConsecutiveErrors, setMaxConsecutiveErrors] = useState(initialSafetySettings.maxConsecutiveErrors ?? 3);
  const [dryRunMode, setDryRunMode] = useState(initialSafetySettings.dryRunMode ?? false);
  const [safetyPausedReason, setSafetyPausedReason] = useState(initialSafetySettings.safetyPausedReason ?? null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const toggleDay = (num: number) => {
    if (selectedDays.includes(num)) {
      if (selectedDays.length === 1) return; // Must have at least 1 sending day
      setSelectedDays(selectedDays.filter((d) => d !== num));
    } else {
      setSelectedDays([...selectedDays, num].sort());
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dailyLimit: Number(dailyLimit),
          sendingWindowStart: windowStart,
          sendingWindowEnd: windowEnd,
          sendingDays: selectedDays.join(","),
          minIntervalSeconds: Number(minIntervalSeconds),
          maxConsecutiveErrors: Number(maxConsecutiveErrors),
          dryRunMode,
        }),
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
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Circuit Breaker Trip Banner */}
      {safetyPausedReason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Circuit Breaker Active
                </h4>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  {safetyPausedReason}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSafetyPausedReason(null)}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-zinc-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* General Campaign Card */}
        <section aria-label="General Settings" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Campaign Settings
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Configure campaign title and sender mailbox identity.
          </p>

          <div className="mt-5 space-y-4">
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
          </div>
        </section>

        {/* Safety & Delivery Guardrails Card */}
        <section aria-label="Safety Guardrails" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Delivery & Safety Guardrails
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Enforce sending throttles, business-hour windows, and circuit-breaker protections to safeguard sender reputation.
          </p>

          <div className="mt-5 space-y-5">
            {/* Daily Send Limit */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Daily Campaign Sending Limit
                </label>
                <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {dailyLimit} emails / day
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Recommended: 20–30 emails/day per campaign to maintain Outlook warm-up health.
              </p>
            </div>

            {/* Business Hours Sending Window */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Business Hours Sending Window (Local Time)
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-zinc-400">Starts At</span>
                  <input
                    type="time"
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400">Ends At</span>
                  <input
                    type="time"
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Active Sending Days */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Active Sending Days
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAYS_MAP.map((day) => {
                  const isSelected = selectedDays.includes(day.num);
                  return (
                    <button
                      key={day.num}
                      type="button"
                      onClick={() => toggleDay(day.num)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stagger Delay & Circuit Breaker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Minimum Dispatch Stagger
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={minIntervalSeconds}
                    onChange={(e) => setMinIntervalSeconds(Number(e.target.value))}
                    className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs text-zinc-500">seconds</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Circuit Breaker Threshold
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxConsecutiveErrors}
                    onChange={(e) => setMaxConsecutiveErrors(Number(e.target.value))}
                    className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs text-zinc-500">consecutive errors</span>
                </div>
              </div>
            </div>

            {/* Dry Run Toggle */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <input
                id="tab-dry-run-checkbox"
                type="checkbox"
                checked={dryRunMode}
                onChange={(e) => setDryRunMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div>
                <label htmlFor="tab-dry-run-checkbox" className="text-xs font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer">
                  Dry Run Mode (Simulate without sending real emails)
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  When enabled, all sequence sends will be processed into the Activity Feed as simulated logs without reaching prospect inboxes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Campaign & Safety Settings"}
          </button>
          {isSaved && (
            <span className="text-xs text-emerald-600 font-medium">✓ Saved successfully</span>
          )}
        </div>
      </form>

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
