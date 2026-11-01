import React, { useState } from "react";
import { OrderDetail } from "../../types";
import { api } from "../../lib/api";
import {
  X,
  Check,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface PaymentModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const PaymentVerificationModal: React.FC<PaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  if (!isOpen || !order) return null;

  const expectedAmount = Number(order.report.breakdown.total_amount);
  const [receivedAmount, setReceivedAmount] = useState<string>(expectedAmount.toFixed(2));
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedUtr, setCopiedUtr] = useState<boolean>(false);
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numReceived = parseFloat(receivedAmount);
  const hasMismatch = !isNaN(numReceived) && numReceived !== expectedAmount;

  const handleCopyUtr = () => {
    if (order.payment?.utr_number) {
      navigator.clipboard.writeText(order.payment.utr_number);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.confirmPayment(order.order_id, !isNaN(numReceived) ? numReceived : undefined);
      onStatusChanged();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to confirm payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMsg("Please specify a reason for rejecting the payment.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.rejectPayment(order.order_id, rejectReason.trim());
      onStatusChanged();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="glass-modal border border-line rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface-subtle transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5 pb-3.5 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-ink">{order.order_id}</span>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300">
              Payment Verification
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Submitted by <strong className="text-ink">{order.student.full_name}</strong> ({order.student.enrollment_number})
          </p>
        </div>

        {/* Payment Verification Data */}
        <div className="space-y-4 text-xs">
          {/* UTR Box */}
          <div className="bg-surface-subtle/80 p-4 rounded-xl border border-line shadow-xs">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
              Submitted 12-Digit Transaction UTR
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-ink tracking-wider">
                {order.payment?.utr_number || "No UTR recorded"}
              </span>
              {order.payment?.utr_number && (
                <button
                  type="button"
                  onClick={handleCopyUtr}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface border border-line rounded-lg hover:bg-surface-subtle shadow-xs transition-all active:scale-[0.98]"
                >
                  {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUtr ? "Copied" : "Copy UTR"}</span>
                </button>
              )}
            </div>
            {order.payment?.payer_vpa && (
              <p className="text-xs text-ink-secondary mt-2.5 pt-2 border-t border-line/60">
                Payer UPI VPA: <span className="font-mono font-bold text-ink">{order.payment.payer_vpa}</span>
              </p>
            )}
          </div>

          {/* Screenshot Preview if available */}
          {order.payment?.screenshot_url && (
            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                Attached Payment Screenshot
              </span>
              <div className="border border-line rounded-xl p-2.5 bg-surface-subtle/80 text-center shadow-xs">
                <a
                  href={order.payment.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block relative group"
                >
                  <img
                    src={order.payment.screenshot_url}
                    alt="Payment Screenshot"
                    className="max-h-48 rounded-lg mx-auto border border-line object-contain shadow-xs"
                  />
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-surface text-xs font-semibold gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Full View</span>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Expected vs Received Amount */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-surface-subtle/80 border border-line rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Amount Due</span>
              <span className="font-mono text-lg font-bold text-ink mt-0.5 block">₹{expectedAmount.toFixed(2)}</span>
            </div>
            <div className="p-3.5 bg-surface border border-line rounded-xl shadow-xs">
              <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Amount Confirmed (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-2.5 py-1 font-mono text-base font-bold text-accent border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {hasMismatch && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Amount Mismatch Warning</p>
                <p className="leading-relaxed mt-0.5">
                  Calculated order cost is ₹{expectedAmount.toFixed(2)}, but confirmed amount is entered as ₹{numReceived.toFixed(2)}. This discrepancy will be logged in the permanent audit trail.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 shadow-xs">
              {errorMsg}
            </div>
          )}

          {/* Rejection Input Box if user toggled reject */}
          {showRejectBox && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5 shadow-xs">
              <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. UTR not found on bank statement. Please verify and re-submit."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-rose-300 rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <p className="text-[11px] text-rose-700 font-medium">
                The student will see this reason on their tracking screen and will be allowed to submit a new UTR.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-line rounded-lg text-ink-secondary hover:bg-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-rose-700 text-surface rounded-lg hover:bg-rose-800 disabled:opacity-40 transition-all shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showRejectBox && (
            <div className="pt-3.5 border-t border-line flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRejectBox(true)}
                className="px-4 py-2.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Payment</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface rounded-xl text-xs font-bold shadow-md shadow-accent/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Payment (Mark Paid)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
