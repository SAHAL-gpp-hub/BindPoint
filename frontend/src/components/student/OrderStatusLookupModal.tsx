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
      <div className="bg-surface border border-line rounded-md max-w-md w-full p-6 shadow-lg relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded hover:bg-surface-subtle"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
            <Search className="w-4 h-4 text-accent" />
            <span>Track Order & Receipt</span>
          </h2>
          <p className="text-xs text-ink-secondary mt-1">
            Check the live printing progress or re-download your digital receipt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Order ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PR-261031-7A2B"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-surface border border-line rounded text-xs font-mono uppercase text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
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
              className="w-full px-3 py-2 bg-surface border border-line rounded text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] bg-accent hover:bg-accent-hover active:bg-accent text-surface text-xs sm:text-sm font-medium py-2.5 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
