import React from "react";
import { ReportUploadResponse } from "../../types";
import { FileText, ArrowRight, ArrowLeft, Info, Receipt } from "lucide-react";

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
    <div className="max-w-xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-subtle text-accent border border-accent/20 mb-3">
          <Receipt className="w-3.5 h-3.5 text-accent" />
          <span>Automated Price Calculation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Printing Cost Calculation
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 leading-relaxed">
          Transparent, server-side pricing calculated strictly based on the physical duplex printing arrangement.
        </p>
      </div>

      {/* Ledger Container */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line">
        {/* Document Header */}
        <div className="flex items-center justify-between pb-5 border-b border-line mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center border border-accent/20">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink uppercase tracking-wider">Document Summary</p>
              <p className="text-xs text-ink-muted truncate max-w-[220px] sm:max-w-xs">{report.original_filename}</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold bg-surface-subtle px-3 py-1.5 rounded-lg border border-line text-ink shadow-xs">
            {report.page_count} PDF Pages
          </span>
        </div>

        {/* Itemized Table */}
        <div className="space-y-4 text-xs sm:text-sm">
          {/* Row 1: Special First Page */}
          <div className="flex items-start justify-between py-1">
            <div className="pr-4">
              <p className="font-semibold text-ink text-sm">1. Special Paper — First Page</p>
              <p className="text-xs text-ink-muted mt-0.5">Page 1 printed single-sided on premium heavy sheet (back blank)</p>
            </div>
            <span className="font-mono font-bold text-ink text-sm tabular-nums shrink-0">
              ₹10.00
            </span>
          </div>

          {/* Row 2: Normal Colour Duplex */}
          <div className="flex items-start justify-between py-1 border-t border-line/70 pt-3">
            <div className="pr-4">
              <p className="font-semibold text-ink text-sm">
                2. Normal Colour Printing ({b.colour_pages} sides)
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Pages 2 through {report.page_count} printed duplex @ ₹5.00 / printed side
              </p>
            </div>
            <span className="font-mono font-bold text-ink text-sm tabular-nums shrink-0">
              ₹{Number(b.colour_printing_cost).toFixed(2)}
            </span>
          </div>

          {/* Row 3: Physical Sheet Breakdown */}
          <div className="flex items-start justify-between py-2 border-t border-line/70 pt-3 bg-surface-subtle/70 px-3 rounded-xl border border-line/60">
            <div>
              <p className="text-xs font-semibold text-ink-secondary">Physical Sheet Count</p>
              <p className="text-[11px] text-ink-muted">
                {b.normal_sheets} normal sheets ({b.blank_sides > 0 ? "1 unused side" : "both sides printed"})
              </p>
            </div>
            <span className="text-xs font-mono text-accent font-semibold px-2 py-0.5 rounded bg-surface border border-line/80">
              Included
            </span>
          </div>

          {/* Row 4: Extra Blank Special Sheet */}
          <div className="flex items-start justify-between py-1 border-t border-line/70 pt-3">
            <div className="pr-4">
              <p className="font-semibold text-ink text-sm">3. Additional Blank Special-Paper Sheet</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Protective blank end sheet inserted at bind station (not in PDF)
              </p>
            </div>
            <span className="font-mono font-bold text-ink text-sm tabular-nums shrink-0">
              ₹10.00
            </span>
          </div>

          {/* Total Row */}
          <div className="border-t-2 border-line pt-4 mt-5 bg-accent-subtle/40 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 rounded-b-2xl border-b border-line flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                Total Printing Cost
              </span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">
                Total physical sheets to print: {b.normal_sheets + b.special_sheets}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-accent tabular-nums">
                ₹{Number(b.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-5 p-3.5 rounded-xl bg-surface-subtle border border-line text-xs text-ink-secondary flex items-start gap-2.5">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Pricing is calculated purely on the backend according to college printing station rates. You must inspect every page of your PDF in the next step before payment can be unlocked.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[48px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded-xl text-xs sm:text-sm font-semibold text-ink-secondary transition-all flex items-center gap-2 shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={onProceed}
            className="min-h-[48px] flex-1 bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-xs sm:text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Review & Verify Complete PDF</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
