"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadUploaderModal } from "./LeadUploaderModal";

export interface LeadItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: string;
  importBatchId: string | null;
  createdAt: string;
}

interface LeadsTableProps {
  initialLeads: LeadItem[];
}

export function LeadsTable({ initialLeads }: LeadsTableProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.toLowerCase();
    return (
      lead.email.toLowerCase().includes(q) ||
      name.includes(q) ||
      (lead.company && lead.company.toLowerCase().includes(q))
    );
  });

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to remove this lead?")) return;

    setDeletingId(leadId);
    try {
      const res = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      }
    } catch {
      // Retain state on error
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Leads Directory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Manage your imported prospect contacts, review status, and prepare campaign cohorts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Import Leads (CSV)
        </button>
      </div>

      {/* Directory Table Card */}
      <section aria-label="Prospect list" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Search & Counter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
            />
            <svg
              className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          <span className="text-xs text-zinc-500 font-mono">
            {filteredLeads.length} of {leads.length} contacts
          </span>
        </div>

        {leads.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No contacts found
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Upload your prospect list as a CSV file to begin building your outreach sequence cohorts.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Upload First CSV
              </button>
            </div>
          </div>
        ) : (
          /* Leads Table */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 font-medium">
                  <th className="pb-3 font-normal">Contact</th>
                  <th className="pb-3 font-normal">Company</th>
                  <th className="pb-3 font-normal">Batch / Added</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredLeads.map((lead) => {
                  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
                  return (
                    <tr key={lead.id} className="text-zinc-700 dark:text-zinc-300">
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <p>{lead.email}</p>
                        {fullName && (
                          <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                            {fullName}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">
                        {lead.company || "—"}
                      </td>
                      <td className="py-3 text-[11px] text-zinc-500 font-mono">
                        {lead.importBatchId || "direct"}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 capitalize">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled={deletingId === lead.id}
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-[11px] font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Upload Modal */}
      <LeadUploaderModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
