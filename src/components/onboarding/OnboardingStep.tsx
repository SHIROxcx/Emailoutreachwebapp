"use client";

import type { OnboardingStepData } from "./steps";

interface OnboardingStepProps {
  step: OnboardingStepData;
}

function StepGraphic({ type }: { type: OnboardingStepData["type"] }) {
  switch (type) {
    case "connect":
      return (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0078D4]/10 text-[#0078D4] dark:bg-[#0078D4]/20">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Microsoft Outlook
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Microsoft Graph API v1.0
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OAuth 2.0 Ready
            </span>
          </div>

          <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-white/90 p-3 text-left dark:border-zinc-700 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
              <span>Security Layer</span>
              <span className="font-mono text-[11px] text-zinc-500">AES-256-GCM</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Delegated token exchange with automatic pre-flight refresh cycles.
            </p>
          </div>
        </div>
      );

    case "upload":
      return (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>CSV Column Mapper Preview</span>
            <span className="font-mono">leads_export.csv</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-zinc-600 dark:text-zinc-300 font-mono">Work Email</span>
              <span className="text-zinc-400 font-mono">→</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                Lead.email
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-zinc-600 dark:text-zinc-300 font-mono">First Name</span>
              <span className="text-zinc-400 font-mono">→</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                Lead.firstName
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-zinc-600 dark:text-zinc-300 font-mono">Company</span>
              <span className="text-zinc-400 font-mono">→</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                Lead.company
              </span>
            </div>
          </div>
        </div>
      );

    case "sequence":
      return (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50 text-left">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Outreach Sequence Builder</span>
            <span className="rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              2 Steps
            </span>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Step 1: Introduction
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Day 0 (Initial)</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                Quick question for <span className="text-blue-600 dark:text-blue-400">{"{{firstName}}"}</span> regarding <span className="text-blue-600 dark:text-blue-400">{"{{company}}"}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 text-[11px] text-zinc-500">
              <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
              <span>Wait 3 business days</span>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Step 2: Follow-up
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">+3 Days</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                Re: Quick question for <span className="text-blue-600 dark:text-blue-400">{"{{firstName}}"}</span>
              </p>
            </div>
          </div>
        </div>
      );

    case "send":
      return (
        <div className="flex w-full flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              BullMQ Dispatch Engine
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              Queue: Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Daily Cap Safe Guard</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                35 / 50 <span className="text-[11px] font-normal text-zinc-500">today</span>
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Stagger Interval</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                30s – 2m <span className="text-[11px] font-normal text-zinc-500">randomized</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
              <span>Anti-Abuse Throttle</span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Compliant with Graph Limits
              </span>
            </div>
          </div>
        </div>
      );
  }
}

export function OnboardingStep({ step }: OnboardingStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100/70 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <span>{step.badge}</span>
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {step.title}
        </h2>
        <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {step.subtitle}
        </p>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
          {step.description}
        </p>
      </div>

      <StepGraphic type={step.type} />

      <ul className="space-y-2 border-t border-zinc-200/70 pt-4 text-left dark:border-zinc-800/70">
        {step.highlights.map((highlight, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
