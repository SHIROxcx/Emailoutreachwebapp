"use client";

import { useState } from "react";
import Link from "next/link";
import { WORKFLOW_STEPS } from "./steps";

interface InlineStepperProps {
  connected: boolean;
  mailbox?: string;
  authError?: string;
}

export function InlineStepper({
  connected,
  mailbox,
  authError,
}: InlineStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = WORKFLOW_STEPS[currentStep];

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Outreach Scheduler
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Cold email outreach sent directly from your personal Outlook.
            </p>
          </div>

          {connected && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          )}
        </div>

        {/* 4-Step Progress Tabs */}
        <div
          role="tablist"
          aria-label="App workflow steps"
          className="mt-6 grid grid-cols-4 gap-1.5 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        >
          {WORKFLOW_STEPS.map((s, idx) => {
            const isActive = idx === currentStep;
            const isStep1Done = idx === 0 && connected;

            return (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setCurrentStep(idx)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    isStep1Done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {isStep1Done ? "✓" : s.number}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="mt-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {step.summary}
            </p>
          </div>

          {/* Contextual Visual Demo per Step */}
          {currentStep === 0 && (
            <div className="flex flex-col gap-3">
              {authError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
                  <p className="font-semibold">Sign in was not completed</p>
                  <p className="mt-0.5">{authError}</p>
                </div>
              ) : connected ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <p className="font-medium">
                    Ready to send as{" "}
                    <span className="font-mono font-semibold">{mailbox ?? "your account"}</span>
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Link
                  href="/api/auth/microsoft/login"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  <svg
                    className="h-4 w-4"
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
                  {connected ? "Reconnect Account" : "Connect Outlook"}
                </Link>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  See How It Works →
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/60 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="border-b border-zinc-200 px-3.5 py-2 font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                Sample Lead Import
              </div>
              <div className="divide-y divide-zinc-200 font-mono text-[11px] dark:divide-zinc-800">
                <div className="grid grid-cols-3 px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                  <span className="truncate">sarah@acme.com</span>
                  <span>Sarah Jenkins</span>
                  <span className="text-zinc-500">Acme Corp</span>
                </div>
                <div className="grid grid-cols-3 px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                  <span className="truncate">marcus@fintech.io</span>
                  <span>Marcus Vance</span>
                  <span className="text-zinc-500">Fintech IO</span>
                </div>
                <div className="grid grid-cols-3 px-3.5 py-2 text-zinc-700 dark:text-zinc-300">
                  <span className="truncate">elena@cloud.dev</span>
                  <span>Elena Rostova</span>
                  <span className="text-zinc-500">Cloud Dev</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between font-medium text-zinc-700 dark:text-zinc-300">
                <span>Email 1: Introduction</span>
                <span className="text-[11px] text-zinc-500">Day 1</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                &ldquo;Hi <span className="font-semibold text-zinc-900 dark:text-zinc-100">{"{{firstName}}"}</span>, saw your work at <span className="font-semibold text-zinc-900 dark:text-zinc-100">{"{{company}}"}</span> and had a quick question...&rdquo;
              </p>
              <div className="flex items-center gap-2 py-1 text-[11px] text-zinc-500">
                <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
                <span>Wait 3 business days if no reply</span>
              </div>
              <div className="flex items-center justify-between font-medium text-zinc-700 dark:text-zinc-300">
                <span>Email 2: Follow-up</span>
                <span className="text-[11px] text-zinc-500">Day 4</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                &ldquo;Re: Quick question — bumping this to the top of your inbox...&rdquo;
              </p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">30–50</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">Daily limit</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">2–5 min</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">Pause between sends</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1-click</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">Pause / resume</p>
              </div>
            </div>
          )}

          {/* Quick Helpful Tip */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Tip:</span> {step.tip}
          </p>

          {/* Bottom Stepper Controls */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <div>
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep > 0 && !connected && (
                <Link
                  href="/api/auth/microsoft/login"
                  className="text-xs font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                >
                  Connect Outlook Now
                </Link>
              )}

              {currentStep < WORKFLOW_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Next: {WORKFLOW_STEPS[currentStep + 1].label} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
                >
                  Back to Step 1
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
