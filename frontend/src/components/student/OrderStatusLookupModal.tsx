import React, { useState } from "react";
import { OrderDetail } from "../../types";
import { api } from "../../lib/api";
import { X, Search, AlertCircle, ArrowRight } from "lucide-react";

interface LookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderFound: (order: OrderDetail) => void;
}

export const OrderStatusLookupModal: React.FC<LookupModalProps> = ({
  isOpen,
  onClose,
  onOrderFound,
}) => {
  const [orderId, setOrderId] = useState("");
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !mobile.trim()) {
      setError("Please provide both Order ID and registered Mobile Number.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const order = await api.getOrder(orderId.trim().toUpperCase(), mobile.trim());
      onOrderFound(order);
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not find order. Verify your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="glass-modal rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-line">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface-subtle transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mb-3 border border-accent/20">
            <Search className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Track Order & Receipt
          </h2>
          <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
            Check the live printing progress or retrieve your official digital receipt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Order ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PR-261031-7A2B"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-xl text-xs font-mono font-semibold uppercase text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Registered 10-Digit Mobile
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              placeholder="9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-xl text-xs font-mono font-semibold text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-xs sm:text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Looking up Order...</span>
                </>
              ) : (
                <>
                  <span>Lookup Order Status</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
