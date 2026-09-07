"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { renderTemplate } from "@/lib/template-engine";

interface SampleLead {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
}

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectTemplate: string;
  bodyTemplate: string;
  sampleLeads?: SampleLead[];
}

const DEFAULT_MOCK_LEAD: SampleLead = {
  email: "alex.rivera@techcorp.io",
  firstName: "Alex",
  lastName: "Rivera",
  company: "TechCorp",
};

export function LivePreviewModal({
  isOpen,
  onClose,
  subjectTemplate,
  bodyTemplate,
  sampleLeads = [],
}: LivePreviewModalProps) {
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [spinKey, setSpinKey] = useState(0);

  const leadsList = sampleLeads.length > 0 ? sampleLeads : [DEFAULT_MOCK_LEAD];
  const activeLead = leadsList[selectedLeadIndex] || leadsList[0];

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const resolved = useMemo(() => {
    const variables: Record<string, string | undefined> = {
      email: activeLead.email,
      firstName: activeLead.firstName ?? undefined,
      lastName: activeLead.lastName ?? undefined,
      company: activeLead.company ?? undefined,
    };

    // spinKey triggers re-render with fresh random pick
    void spinKey;

    return {
      subject: renderTemplate(subjectTemplate, variables),
      body: renderTemplate(bodyTemplate, variables),
    };
  }, [subjectTemplate, bodyTemplate, activeLead, spinKey]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-900">
          <div>
            <h2 id="preview-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Message Preview & Spintax Inspector
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Test how your variables and spintax variations resolve for real prospect leads.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lead Selector & Re-Spin Trigger */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Previewing with:</span>
            <select
              value={selectedLeadIndex}
              onChange={(e) => setSelectedLeadIndex(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {leadsList.map((lead, idx) => (
                <option key={idx} value={idx}>
                  {lead.firstName ? `${lead.firstName} (${lead.company || lead.email})` : lead.email}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSpinKey((k) => k + 1)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Re-Spin Options
          </button>
        </div>

        {/* Resolved Preview Card */}
        <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Subject</span>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {resolved.subject || "(Empty Subject)"}
            </p>
          </div>

          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Message Body</span>
            <div className="mt-1.5 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 font-sans">
              {resolved.body || "(Empty Body)"}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Spintax randomizes independently on every email dispatch to safeguard deliverability.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
