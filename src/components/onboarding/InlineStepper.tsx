"use client";

import { useState } from "react";
import Link from "next/link";
import { ONBOARDING_STEPS } from "./steps";

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
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const activeStep = ONBOARDING_STEPS[activeStepIndex];

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6">
      <main className="flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        {/* App Title & Intro */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Outreach Scheduler
            </h1>
            {connected && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Connect your Outlook, upload leads, build an automated sequence, and dispatch safely.
          </p>
        </div>

        {/* Inline Horizontal Stepper Bar */}
        <nav
          aria-label="Workflow pipeline stages"
          className="relative flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          {ONBOARDING_STEPS.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            const isPassed = idx < activeStepIndex;
            const isStep1Connected = idx === 0 && connected;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                aria-current={isActive ? "step" : undefined}
                className={`group relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 px-2 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                  isActive
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    isStep1Connected
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : isPassed
                          ? "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          : "bg-zinc-200/80 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {isStep1Connected ? (
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.stepNumber
                  )}
                </span>
                <span className="hidden sm:inline font-medium">{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Step Panel */}
        <div className="flex flex-col gap-5">
          {/* Step Meta / Header */}
          <div className="border-b border-zinc-100 pb-3 dark:border-zinc-900">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Step {activeStep.stepNumber} · {activeStep.label}
              </span>
              <span>{activeStep.subtitle}</span>
            </div>
            <h2 className="mt-1.5 text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {activeStep.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {activeStep.description}
            </p>
          </div>

          {/* Step 1 Specific: Live Connect Status & Actions */}
          {activeStepIndex === 0 && (
            <div className="flex flex-col gap-4">
              {authError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 dark:border-red-900/80 dark:bg-red-950/50 dark:text-red-300">
                  <p className="font-semibold">Connection failed</p>
                  <p className="mt-0.5 break-all text-xs">{authError}</p>
                </div>
              ) : connected ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <p className="font-semibold">Outlook connected</p>
                  {mailbox ? (
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                      Sending mail through <span className="font-mono font-medium">{mailbox}</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                      Mailbox connection active and authenticated.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-xs sm:text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                  Not connected yet. Connect your personal or work Microsoft account to enable sending.
                </div>
              )}

              {/* Action Buttons for Step 1 */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href="/api/auth/microsoft/login"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
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
                  {connected ? "Reconnect Outlook" : "Connect Outlook"}
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveStepIndex(1)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  <span>Explore Workflow</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2 Specific: Column Mapping Visual */}
          {activeStepIndex === 1 && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-2">
                  <span>CSV Column Mapper Preview</span>
                  <span className="font-mono text-[11px]">leads_example.csv</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">Work Email</span>
                    <span className="text-zinc-400 font-mono">→</span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      Lead.email
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">First Name</span>
                    <span className="text-zinc-400 font-mono">→</span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      Lead.firstName
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="font-mono text-zinc-600 dark:text-zinc-300">Company</span>
                    <span className="text-zinc-400 font-mono">→</span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      Lead.company
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Specific: Sequence Timeline Visual */}
          {activeStepIndex === 2 && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-2">
                  <span>Outreach Sequence Timeline</span>
                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                    2 Scheduled Steps
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Step 1: Introduction
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">Day 0 (Initial)</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      Subject: Quick question for{" "}
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {"{{firstName}}"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-3 text-[11px] text-zinc-500">
                    <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
                    <span>Wait 3 business days delay</span>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Step 2: Follow-up
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">+3 Days</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      Subject: Re: Quick question for{" "}
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {"{{firstName}}"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 Specific: Scheduler & Queue Gauge Visual */}
          {activeStepIndex === 3 && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-2">
                  <span>BullMQ Background Scheduler</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Safe Throttle Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Daily Cap Protection</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      35 / 50 <span className="text-[11px] font-normal text-zinc-500">today</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Dispatch Jitter</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      30s – 2m <span className="text-[11px] font-normal text-zinc-500">staggered</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Highlight Bullets */}
          <ul className="space-y-1.5 rounded-lg bg-zinc-50/50 p-3 dark:bg-zinc-900/30 text-xs text-zinc-600 dark:text-zinc-300">
            {activeStep.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200"
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
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {/* Stepper Navigation Footer (Previous / Next) */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-900">
            <button
              type="button"
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-900 disabled:invisible dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-3">
              {activeStepIndex > 0 && !connected && (
                <Link
                  href="/api/auth/microsoft/login"
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  Connect Outlook
                </Link>
              )}

              {activeStepIndex < ONBOARDING_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStepIndex((prev) => prev + 1)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 transition-colors"
                >
                  <span>Next: {ONBOARDING_STEPS[activeStepIndex + 1].label}</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(0)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 transition-colors"
                >
                  <span>Back to Step 1</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
