"use client";

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  onSelectStep?: (index: number) => void;
}

export function StepIndicator({
  totalSteps,
  currentStep,
  onSelectStep,
}: StepIndicatorProps) {
  return (
    <nav
      aria-label="Onboarding Progress"
      className="flex items-center justify-center gap-2.5"
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCurrent = i === currentStep;
        const isCompleted = i < currentStep;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectStep && onSelectStep(i)}
            disabled={!onSelectStep}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Step ${i + 1} of ${totalSteps}${
              isCurrent ? " (Current)" : isCompleted ? " (Completed)" : ""
            }`}
            className={`group relative flex h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
              isCurrent
                ? "w-10 bg-zinc-900 dark:bg-zinc-100"
                : isCompleted
                  ? "w-3 bg-zinc-400 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-400"
                  : "w-3 bg-zinc-200 dark:bg-zinc-800"
            }`}
          />
        );
      })}
    </nav>
  );
}
