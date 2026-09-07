"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";

interface LeadUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

type Step = "file" | "mapping" | "submitting" | "done";

interface ColumnMapping {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
}

export function LeadUploaderModal({
  isOpen,
  onClose,
  onImportSuccess,
}: LeadUploaderModalProps) {
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    importedCount: number;
    skippedCount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "submitting") {
        onClose();
      }
    },
    [step, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const autoDetectColumns = (cols: string[]): ColumnMapping => {
    const findMatch = (patterns: string[]): string => {
      for (const col of cols) {
        const lower = col.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const p of patterns) {
          if (lower.includes(p)) return col;
        }
      }
      return "";
    };

    return {
      email: findMatch(["email", "mail", "contact"]),
      firstName: findMatch(["firstname", "fname", "first"]),
      lastName: findMatch(["lastname", "lname", "last"]),
      company: findMatch(["company", "organization", "org", "business"]),
    };
  };

  const handleFileChange = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a standard CSV file (.csv).");
      return;
    }

    setFile(selectedFile);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setError("Could not detect any column headers in the CSV file.");
          return;
        }

        const fields = results.meta.fields;
        setHeaders(fields);
        setRows(results.data);
        setMapping(autoDetectColumns(fields));
        setStep("mapping");
      },
      error: (err) => {
        setError(`Failed to read CSV: ${err.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!mapping.email) {
      setError("Please choose which column contains the Email address.");
      return;
    }

    setError(null);
    setStep("submitting");

    // Transform parsed rows according to mapping
    const payloadLeads = rows.map((row) => {
      const email = row[mapping.email] || "";
      const firstName = mapping.firstName ? row[mapping.firstName] : undefined;
      const lastName = mapping.lastName ? row[mapping.lastName] : undefined;
      const company = mapping.company ? row[mapping.company] : undefined;

      // Extract custom fields from other unmapped columns
      const customFields: Record<string, string> = {};
      const mappedColValues = new Set([
        mapping.email,
        mapping.firstName,
        mapping.lastName,
        mapping.company,
      ]);

      for (const [key, val] of Object.entries(row)) {
        if (!mappedColValues.has(key) && val) {
          customFields[key] = val;
        }
      }

      return {
        email,
        firstName,
        lastName,
        company,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };
    });

    try {
      const res = await fetch("/api/leads/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payloadLeads }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
      });
      setStep("done");
      onImportSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error during import");
      setStep("mapping");
    }
  };

  const resetModal = () => {
    setStep("file");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({ email: "", firstName: "", lastName: "", company: "" });
    setError(null);
    setResult(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-900">
          <div>
            <h2 id="upload-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {step === "file" && "Upload Leads CSV"}
              {step === "mapping" && "Match Spreadsheet Columns"}
              {step === "submitting" && "Importing Contacts..."}
              {step === "done" && "Import Complete"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {step === "file" && "Import a list of prospective contacts into your outreach workspace."}
              {step === "mapping" && "Verify how columns in your spreadsheet match standard fields."}
              {step === "submitting" && "Validating emails and filtering duplicate contacts."}
              {step === "done" && "Your prospects have been imported and are ready for campaigns."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Step 1: File Dropzone */}
        {step === "file" && (
          <div className="mt-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center cursor-pointer transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Click to browse or drag and drop a CSV
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Supports standard comma-separated files (.csv) up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>File: <strong className="text-zinc-900 dark:text-zinc-100">{file?.name}</strong></span>
              <span>{rows.length} rows detected</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Email Column <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping.email}
                  onChange={(e) => setMapping((m) => ({ ...m, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Company Column
                </label>
                <select
                  value={mapping.company}
                  onChange={(e) => setMapping((m) => ({ ...m, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">(None / Ignore)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  First Name Column
                </label>
                <select
                  value={mapping.firstName}
                  onChange={(e) => setMapping((m) => ({ ...m, firstName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">(None / Ignore)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Last Name Column
                </label>
                <select
                  value={mapping.lastName}
                  onChange={(e) => setMapping((m) => ({ ...m, lastName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">(None / Ignore)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live 3-Row Preview */}
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Preview (First 3 Contacts)
              </p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/60 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400">
                      <th className="px-3 py-1.5 font-normal">Email</th>
                      <th className="px-3 py-1.5 font-normal">First Name</th>
                      <th className="px-3 py-1.5 font-normal">Last Name</th>
                      <th className="px-3 py-1.5 font-normal">Company</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                    {rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="text-zinc-700 dark:text-zinc-300">
                        <td className="px-3 py-1.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                          {mapping.email ? r[mapping.email] || "—" : "(Unmapped)"}
                        </td>
                        <td className="px-3 py-1.5">
                          {mapping.firstName ? r[mapping.firstName] || "—" : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          {mapping.lastName ? r[mapping.lastName] || "—" : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          {mapping.company ? r[mapping.company] || "—" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setStep("file")}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ← Choose Different File
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={!mapping.email}
                className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Import {rows.length} Contacts
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === "submitting" && (
          <div className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
            <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Importing leads and verifying duplicates...
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && result && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {result.importedCount} Leads Successfully Imported
              </h3>
              {result.skippedCount > 0 && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {result.skippedCount} duplicate emails were detected and safely skipped.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
