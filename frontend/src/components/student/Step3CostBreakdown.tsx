import React from "react";
import { ReportUploadResponse } from "../../types";
import { FileText, ArrowRight, ArrowLeft, Info } from "lucide-react";

interface Step3Props {
  report: ReportUploadResponse;
  onProceed: () => void;
  onBack: () => void;
}

export const Step3CostBreakdown: React.FC<Step3Props> = ({
  report,
  onProceed,
  onBack,
}) => {
  const b = report.breakdown;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          Printing Cost Calculation
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Automated server-side pricing breakdown based on the physical duplex printing arrangement.
        </p>
      </div>

      {/* Ledger Container */}
      <div className="bg-surface border border-line rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-accent" />
            <div>
              <p className="text-xs font-semibold text-ink uppercase tracking-wider">Document Summary</p>
              <p className="text-xs text-ink-muted truncate max-w-[240px] sm:max-w-xs">{report.original_filename}</p>
            </div>
          </div>
          <span className="font-mono text-xs font-semibold bg-surface-subtle px-2.5 py-1 rounded border border-line">
            {report.page_count} PDF Pages
          </span>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3 text-xs sm:text-sm">
          {/* Row 1: Special First Page */}
          <div className="flex items-start justify-between py-1">
            <div>
              <p className="font-medium text-ink">1. Special Paper — First Page</p>
              <p className="text-[11px] text-ink-muted">Page 1 printed single-sided on premium heavy sheet (back blank)</p>
            </div>
            <span className="font-mono font-medium text-ink tabular-nums">
              ₹10.00
            </span>
          </div>

          {/* Row 2: Normal Colour Duplex */}
          <div className="flex items-start justify-between py-1 border-t border-line/60 pt-2.5">
            <div>
              <p className="font-medium text-ink">
                2. Normal Colour Printing ({b.colour_pages} sides)
              </p>
              <p className="text-[11px] text-ink-muted">
                Pages 2 through {report.page_count} printed duplex @ ₹5.00 / printed side
              </p>
            </div>
            <span className="font-mono font-medium text-ink tabular-nums">
              ₹{Number(b.colour_printing_cost).toFixed(2)}
            </span>
          </div>

          {/* Row 3: Physical Sheet Breakdown */}
          <div className="flex items-start justify-between py-1 border-t border-line/60 pt-2.5 bg-surface-subtle/50 px-2 rounded">
            <div>
              <p className="text-xs text-ink-secondary">Physical Sheet Count</p>
              <p className="text-[11px] text-ink-muted">
                {b.normal_sheets} normal sheets ({b.blank_sides > 0 ? "1 unused side" : "both sides printed"})
              </p>
            </div>
            <span className="text-[11px] font-mono text-ink-muted italic">
              Included
            </span>
          </div>

          {/* Row 4: Extra Blank Special Sheet */}
          <div className="flex items-start justify-between py-1 border-t border-line/60 pt-2.5">
            <div>
              <p className="font-medium text-ink">3. Additional Blank Special-Paper Sheet</p>
              <p className="text-[11px] text-ink-muted">
                Protective blank end sheet inserted at bind station (not in PDF)
              </p>
            </div>
            <span className="font-mono font-medium text-ink tabular-nums">
              ₹10.00
            </span>
          </div>

          {/* Total Row */}
          <div className="border-t-2 border-line pt-3 mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-sm font-semibold text-ink uppercase tracking-wider block">
                Total Printing Cost
              </span>
              <span className="text-[11px] text-ink-muted">
                Total physical sheets to print: {b.normal_sheets + b.special_sheets}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-bold font-mono text-accent tabular-nums">
                ₹{Number(b.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 rounded bg-surface-subtle border border-line text-[11px] text-ink-secondary flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
          <span>
            Pricing is calculated purely on the backend according to college printing station rates. You must inspect every page of your PDF in the next step before payment can be unlocked.
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded text-xs sm:text-sm font-medium text-ink-secondary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onProceed}
          className="min-h-[48px] flex-1 bg-accent hover:bg-accent-hover active:bg-accent text-surface text-xs sm:text-sm font-medium py-2.5 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>Review & Verify Complete PDF</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
