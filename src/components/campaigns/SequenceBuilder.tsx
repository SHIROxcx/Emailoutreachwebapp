"use client";

import { useState } from "react";
import { LivePreviewModal } from "./LivePreviewModal";

export interface SequenceStepData {
  id?: string;
  stepOrder: number;
  delayDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

interface SequenceBuilderProps {
  campaignId: string;
  initialSteps: SequenceStepData[];
  sampleLeads?: Array<{
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  }>;
}

export function SequenceBuilder({
  campaignId,
  initialSteps,
  sampleLeads = [],
}: SequenceBuilderProps) {
  const [steps, setSteps] = useState<SequenceStepData[]>(
    initialSteps.length > 0
      ? initialSteps
      : [
          {
            stepOrder: 1,
            delayDays: 0,
            subjectTemplate: "{{RANDOM | Quick question | Checking in}} for {{firstName | there}}",
            bodyTemplate:
              "{{RANDOM | Hi | Hello | Hey}} {{firstName | there}},\n\nI noticed your work at {{company | your company}} and wanted to see if you would be open to a quick call.\n\nBest,\n{{RANDOM | Cheers | Thanks | Regards}}",
          },
        ],
  );

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const activeStep = steps[activeStepIndex] || steps[0];

  const handleUpdateActiveStep = (
    field: "subjectTemplate" | "bodyTemplate" | "delayDays",
    value: string | number,
  ) => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === activeStepIndex ? { ...s, [field]: value } : s)),
    );
    setSaveStatus("idle");
  };

  const handleAddStep = () => {
    const nextOrder = steps.length + 1;
    const newStep: SequenceStepData = {
      stepOrder: nextOrder,
      delayDays: 3,
      subjectTemplate: "Re: " + (steps[0]?.subjectTemplate || "Follow-up"),
      bodyTemplate:
        "{{RANDOM | Hi | Hey}} {{firstName | there}},\n\nFollowing up on my previous note. Would love to hear your thoughts when you have a moment.\n\nThanks,\n{{RANDOM | Best | Regards}}",
    };
    setSteps((prev) => [...prev, newStep]);
    setActiveStepIndex(steps.length);
    setSaveStatus("idle");
  };

  const handleDeleteStep = (indexToDelete: number) => {
    if (steps.length <= 1) return;
    const updated = steps
      .filter((_, idx) => idx !== indexToDelete)
      .map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    setSteps(updated);
    setActiveStepIndex(Math.max(0, indexToDelete - 1));
    setSaveStatus("idle");
  };

  const handleInsertTag = (tag: string) => {
    const current = activeStep.bodyTemplate;
    handleUpdateActiveStep("bodyTemplate", current + tag);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Timeline Steps */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Outreach Pipeline
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            {steps.length} {steps.length === 1 ? "step" : "steps"}
          </span>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div key={idx} className="relative flex flex-col gap-2">
                {idx > 0 && (
                  <div className="flex items-center gap-2 pl-4 py-1 text-[11px] text-zinc-500">
                    <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
                    <span>Wait</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={step.delayDays}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setSteps((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, delayDays: val } : s)),
                        );
                        setSaveStatus("idle");
                      }}
                      className="w-12 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-center font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <span>days after Step {idx}</span>
                  </div>
                )}

                <div
                  onClick={() => setActiveStepIndex(idx)}
                  className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all ${
                    isActive
                      ? "border-zinc-900 bg-white shadow-xs dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Step {step.stepOrder} {idx === 0 ? "(Initial)" : "(Follow-up)"}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStep(idx);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-0.5"
                        aria-label={`Delete Step ${step.stepOrder}`}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500 font-mono">
                    {step.subjectTemplate || "Untitled subject"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddStep}
          className="mt-2 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Follow-up Step
        </button>
      </div>

      {/* Right Column: Step Editor */}
      <div className="lg:col-span-8 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-900">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Editing Step {activeStep.stepOrder}
            </h3>
            <p className="text-xs text-zinc-500">
              {activeStepIndex === 0
                ? "Sent immediately upon prospect enrollment"
                : `Sent ${activeStep.delayDays} days after previous step`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview & Test
          </button>
        </div>

        {/* Subject Field */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Subject Line
          </label>
          <input
            type="text"
            value={activeStep.subjectTemplate}
            onChange={(e) => handleUpdateActiveStep("subjectTemplate", e.target.value)}
            placeholder="e.g. {{RANDOM | Quick question | Hello}} for {{firstName}}"
            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 font-mono placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Body Field */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email Body Template
          </label>
          <textarea
            rows={10}
            value={activeStep.bodyTemplate}
            onChange={(e) => handleUpdateActiveStep("bodyTemplate", e.target.value)}
            placeholder="Write your email body here. Use variables like {{firstName}} and {{RANDOM | opt1 | opt2}}..."
            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-900 font-mono placeholder:font-sans placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 resize-y"
          />
        </div>

        {/* Quick Insertion Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 text-[11px] pr-1">Insert:</span>
            <button
              type="button"
              onClick={() => handleInsertTag(" {{firstName}} ")}
              className="rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              +{"{{firstName}}"}
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag(" {{company}} ")}
              className="rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              +{"{{company}}"}
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag(" {{email}} ")}
              className="rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              +{"{{email}}"}
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag(" {{RANDOM | Option 1 | Option 2}} ")}
              className="rounded border border-dashed border-zinc-300 px-2 py-1 font-mono text-[11px] text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              +{"{Spintax}"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Changes saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                Save failed
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {isSaving ? "Saving..." : "Save Sequence"}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <LivePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subjectTemplate={activeStep.subjectTemplate}
        bodyTemplate={activeStep.bodyTemplate}
        sampleLeads={sampleLeads}
      />
    </div>
  );
}
