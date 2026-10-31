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
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 text-ink hover:text-accent transition-colors">
          <div className="w-8 h-8 rounded bg-accent text-surface flex items-center justify-center shadow-subtle">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight block leading-none">Print Station</span>
            <span className="text-[11px] text-ink-muted leading-none font-mono">College Project Dispatch</span>
          </div>
        </a>

        <div className="flex items-center gap-2">
          {onOpenStatusLookup && (
            <button
              onClick={onOpenStatusLookup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface-subtle border border-line rounded transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-ink-muted" />
              <span>Track Order</span>
            </button>
          )}

          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-surface-subtle border border-line rounded transition-colors"
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
