"use client";

import { useState, useEffect } from "react";
import { OnboardingWizard, STORAGE_KEY } from "./onboarding/OnboardingWizard";

interface HomeClientProps {
  connected: boolean;
  mailbox?: string;
  authError?: string;
  children: React.ReactNode;
}

export function HomeClient({
  connected,
  children,
}: HomeClientProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const completed = localStorage.getItem(STORAGE_KEY) === "1";
      // Only show onboarding automatically if user is not connected and hasn't completed it yet
      if (!completed && !connected) {
        setShowOnboarding(true);
      }
    } catch {
      // Fallback if localStorage is inaccessible
      if (!connected) {
        setShowOnboarding(true);
      }
    }
  }, [connected]);

  // Avoid flash during initial hydration
  if (!mounted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black opacity-0">
        {children}
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      {children}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setShowOnboarding(true)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          How does it work? View product tour
        </button>
      </div>
    </div>
  );
}
