"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadUploaderModal } from "./LeadUploaderModal";
import { SendTestModal } from "../dashboard/SendTestModal";

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

interface CampaignOption {
  id: string;
  name: string;
  status: string;
}

interface LeadsTableProps {
  initialLeads: LeadItem[];
  campaigns?: CampaignOption[];
  mailboxEmail?: string;
}

export function LeadsTable({
  initialLeads,
  campaigns = [],
  mailboxEmail = "demo.outreach@outlook.com",
}: LeadsTableProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadItem[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || "",
  );

  // Single Lead Quick Send Modal State
  const [testLead, setTestLead] = useState<LeadItem | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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

  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selectedIds.has(l.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

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
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
        showFeedback("Lead removed successfully.");
      }
    } catch {
      // Retain state on error
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to remove ${selectedIds.size} selected leads?`,
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => !selectedIds.has(l.id)));
        setSelectedIds(new Set());
        showFeedback("Selected leads removed.");
      }
    } catch {
      // Error
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedIds.size === 0 || !selectedCampaignId) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(
          `Enrolled ${data.enrolledCount} leads into campaign (${data.skippedCount || 0} already enrolled).`,
        );
        setSelectedIds(new Set());
      } else {
        alert(data.error || "Failed to enroll leads");
      }
    } catch {
      alert("Error enrolling leads");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetDemoLeads = async () => {
    if (
      !confirm(
        "Reset leads with 12 clean B2B demo prospects? This clears real leads.",
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/leads/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
        showFeedback(`Successfully seeded ${data.seededCount} demo prospects!`);
      }
    } catch {
      alert("Failed to seed demo leads");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearAllLeads = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL leads in your database? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/leads/demo", { method: "DELETE" });
      if (res.ok) {
        setLeads([]);
        setSelectedIds(new Set());
        showFeedback("All leads cleared.");
      }
    } catch {
      alert("Failed to clear leads");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const listToExport =
      selectedIds.size > 0
        ? leads.filter((l) => selectedIds.has(l.id))
        : filteredLeads;

    const headers = ["email", "firstName", "lastName", "company", "status"];
    const rows = listToExport.map((l) => [
      l.email,
      l.firstName || "",
      l.lastName || "",
      l.company || "",
      l.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join(
        "\n",
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `outreach_leads_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Leads Directory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Manage your prospect contacts, configure merge variables, and execute quick dispatches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reset Demo Leads Button */}
          <button
            type="button"
            onClick={handleResetDemoLeads}
            disabled={isActionLoading}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-xs transition-colors disabled:opacity-50"
            title="Purge leads and populate 12 fresh B2B demo prospects"
          >
            <svg
              className="h-3.5 w-3.5 text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Generate Demo Leads
          </button>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-xs transition-colors"
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
            Import Leads (CSV)
          </button>

          {leads.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllLeads}
              disabled={isActionLoading}
              className="flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
              title="Delete all leads"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between animate-fadeIn">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Directory Table Section */}
      <section
        aria-label="Prospect list"
        className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Search & Bulk Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="relative w-full sm:w-80">
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>

            <span className="text-xs text-zinc-500 font-mono">
              {filteredLeads.length} contacts
            </span>
          </div>
        </div>

        {/* Sticky Bulk Selection Bar (appears when 1 or more leads selected) */}
        {selectedIds.size > 0 && (
          <div className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-mono font-medium text-white dark:bg-white dark:text-black">
                {selectedIds.size}
              </span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                leads selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ml-1 underline"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {campaigns.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkEnroll}
                    disabled={isActionLoading}
                    className="h-8 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    Enroll in Campaign
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isActionLoading}
                className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
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
              Upload your prospect list as a CSV file or generate clean demo prospects to begin building sequences.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetDemoLeads}
                className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
              >
                Generate Demo Leads
              </button>
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
              >
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          /* Leads Table */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 dark:border-zinc-900 dark:text-zinc-500 font-medium">
                  <th className="pb-3 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all filtered contacts"
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-0 dark:border-zinc-700"
                    />
                  </th>
                  <th className="pb-3 font-normal">Contact</th>
                  <th className="pb-3 font-normal">Company</th>
                  <th className="pb-3 font-normal">Batch</th>
                  <th className="pb-3 font-normal">Status</th>
                  <th className="pb-3 font-normal text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredLeads.map((lead) => {
                  const fullName = [lead.firstName, lead.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const isSelected = selectedIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`text-zinc-700 dark:text-zinc-300 transition-colors ${
                        isSelected
                          ? "bg-zinc-50 dark:bg-zinc-900/40"
                          : "hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(lead.id)}
                          aria-label={`Select ${lead.email}`}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-0 dark:border-zinc-700"
                        />
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-xs">{lead.email}</p>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(lead.email)}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            title="Copy email address"
                          >
                            {copiedEmail === lead.email ? (
                              <span className="text-[10px] text-emerald-600 font-sans">
                                Copied
                              </span>
                            ) : (
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {fullName && (
                          <p className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {fullName}
                          </p>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3 text-zinc-600 dark:text-zinc-300">
                        {lead.company || "—"}
                      </td>

                      {/* Batch */}
                      <td className="py-3 text-[11px] text-zinc-400 font-mono">
                        {lead.importBatchId?.startsWith("demo")
                          ? "demo"
                          : lead.importBatchId
                            ? lead.importBatchId.slice(0, 10)
                            : "direct"}
                      </td>

                      {/* Status */}
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 capitalize">
                          {lead.status}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Send Test Email */}
                          <button
                            type="button"
                            onClick={() => setTestLead(lead)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                            title={`Send test email directly to ${lead.email}`}
                          >
                            <svg
                              className="h-3 w-3 text-zinc-500"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Test Send
                          </button>

                          {/* Remove Lead */}
                          <button
                            type="button"
                            disabled={deletingId === lead.id}
                            onClick={() => handleDeleteLead(lead.id)}
                            className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Remove lead"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CSV Uploader Modal */}
      <LeadUploaderModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportSuccess={() => {
          router.refresh();
        }}
      />

      {/* Quick Test Send Modal pre-populated with lead */}
      {testLead && (
        <SendTestModal
          isOpen={true}
          onClose={() => setTestLead(null)}
          senderEmail={mailboxEmail}
          initialRecipient={testLead.email}
          initialFirstName={testLead.firstName || undefined}
          initialCompany={testLead.company || undefined}
          onSendSuccess={(_count, _log) => {
            showFeedback(`Dispatched test message to ${testLead.email}`);
            setTestLead(null);
          }}
        />
      )}
    </div>
  );
}
