"use client";

import { useState, useCallback, useEffect } from "react";
import { ONBOARDING_STEPS } from "./steps";
import { OnboardingStep } from "./OnboardingStep";
import { StepIndicator } from "./StepIndicator";

export const STORAGE_KEY = "outreach_onboarding_complete";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const markComplete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage write failures (e.g. private mode)
    }
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      markComplete();
    }
  }, [currentStep, markComplete]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSelectStep = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handleBack();
      } else if (e.key === "Escape") {
        markComplete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handleBack, markComplete]);

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6">
      <main className="flex w-full max-w-xl flex-col gap-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        {/* Top Header with Progress Dots and Step Count */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-900">
          <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            Product Tour
          </span>
          <StepIndicator
            totalSteps={ONBOARDING_STEPS.length}
            currentStep={currentStep}
            onSelectStep={handleSelectStep}
          />
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {currentStep + 1}/{ONBOARDING_STEPS.length}
          </span>
        </div>

        {/* Step Visual and Explanation */}
        <div key={step.id} className="transition-opacity duration-200">
          <OnboardingStep step={step} />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <div>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
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
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
                Back
              </button>
            ) : (
              <div className="w-12" aria-hidden="true" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={markComplete}
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Skip Tour
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
            >
              <span>{isLast ? "Get Started" : "Next Step"}</span>
              {!isLast && (
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
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
