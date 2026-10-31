import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: number;
  label: string;
  shortLabel: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: "Student Information", shortLabel: "Details" },
  { id: 2, label: "Upload Report", shortLabel: "Upload" },
  { id: 3, label: "Cost Breakdown", shortLabel: "Cost" },
  { id: 4, label: "PDF Verification", shortLabel: "Verify" },
  { id: 5, label: "Payment", shortLabel: "Pay" },
  { id: 6, label: "Order Status", shortLabel: "Status" },
];

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, onStepClick }) => {
  const current = STEPS.find((s) => s.id === currentStep) || STEPS[0];

  return (
    <div className="w-full bg-surface border-b border-line py-3 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Mobile View: Compact single-line with progress segment */}
        <div className="sm:hidden flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-ink-muted">Step {currentStep} of {STEPS.length}</span>
            <span className="font-medium text-ink">{current.label}</span>
          </div>
          <div className="grid grid-cols-6 gap-1 h-1 w-full bg-surface-subtle rounded-full overflow-hidden">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-full transition-colors duration-200 ${
                  s.id <= currentStep ? "bg-accent" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop View: Clean horizontal numbered stepper */}
        <div className="hidden sm:flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isClickable = onStepClick && step.id < currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(step.id)}
                  className={`flex items-center gap-2 group text-left ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-medium transition-colors ${
                      isCompleted
                        ? "bg-accent text-surface"
                        : isCurrent
                        ? "border-2 border-accent text-accent bg-accent-subtle"
                        : "border border-line text-ink-muted bg-surface"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.id}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap transition-colors ${
                      isCurrent
                        ? "font-semibold text-ink"
                        : isCompleted
                        ? "font-medium text-ink-secondary group-hover:text-ink"
                        : "text-ink-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 mx-3 h-[1px] transition-colors ${
                      step.id < currentStep ? "bg-accent" : "bg-line"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
