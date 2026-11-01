import React from "react";
import { Printer, ShieldCheck, Search } from "lucide-react";

interface HeaderProps {
  onOpenStatusLookup?: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenStatusLookup,
  isAdmin,
  onAdminClick,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-line shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & College Department Identity */}
        <a href="/" className="flex items-center gap-3.5 text-ink hover:text-accent transition-all group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light text-surface flex items-center justify-center shadow-md shadow-accent/20 group-hover:scale-105 transition-transform ring-1 ring-white/20 shrink-0">
            <Printer className="w-5 h-5 text-surface" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight block leading-tight text-ink group-hover:text-accent transition-colors">
                BindPoint
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>
            <span className="text-xs text-ink-secondary font-medium tracking-normal block leading-tight mt-0.5">
              College Project Report Dispatch
            </span>
          </div>
        </a>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenStatusLookup && (
            <button
              onClick={onOpenStatusLookup}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink bg-surface hover:bg-surface-subtle border border-line rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              <Search className="w-3.5 h-3.5 text-ink-muted" />
              <span>Track Order</span>
            </button>
          )}

          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border shadow-xs transition-all active:scale-[0.98] ${
                isAdmin
                  ? "bg-accent/10 border-accent/25 text-accent hover:bg-accent/15"
                  : "bg-surface hover:bg-surface-subtle border-line text-ink-secondary hover:text-ink"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>{isAdmin ? "Admin Station" : "Admin Login"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
