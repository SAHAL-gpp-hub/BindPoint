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
  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-5 pb-2">
      <div className="bg-surface/90 backdrop-blur-md border border-line rounded-2xl px-4 sm:px-6 py-3.5 shadow-card">
        {/* Mobile View: Compact single-line with progress segment */}
        <div className="sm:hidden flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-accent text-surface text-[11px] font-mono font-bold flex items-center justify-center shadow-xs">
                {currentStep}
              </span>
              <span className="font-bold text-ink">{current.label}</span>
            </div>
            <span className="font-mono text-ink-muted text-[11px] font-medium">
              Step {currentStep} of {STEPS.length} ({progressPercent}%)
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden p-0.5 border border-line/60">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-full rounded-full transition-all duration-300 ${
                  s.id <= currentStep ? "bg-accent shadow-xs" : "bg-transparent"
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
                  className={`flex items-center gap-2.5 group text-left transition-all ${
                    isClickable ? "cursor-pointer hover:opacity-90" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                        : isCurrent
                        ? "bg-accent text-surface ring-4 ring-accent/15 shadow-sm scale-105"
                        : "border border-line text-ink-muted bg-surface-subtle/80"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.id}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap transition-colors ${
                      isCurrent
                        ? "font-bold text-ink"
                        : isCompleted
                        ? "font-semibold text-ink-secondary group-hover:text-ink"
                        : "text-ink-muted font-medium"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 mx-2.5 sm:mx-3 h-[2px] rounded-full transition-all duration-300 ${
                      step.id < currentStep ? "bg-emerald-600" : "bg-line"
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
