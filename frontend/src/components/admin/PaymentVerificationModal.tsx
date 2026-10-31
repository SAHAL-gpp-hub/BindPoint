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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-surface border border-line rounded-md max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded hover:bg-surface-subtle"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{order.order_id}</span>
            <span className="text-[11px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
              Payment Verification
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Submitted by {order.student.full_name} ({order.student.enrollment_number})
          </p>
        </div>

        {/* Payment Verification Data */}
        <div className="space-y-4 text-xs">
          {/* UTR Box */}
          <div className="bg-surface-subtle p-3.5 rounded border border-line">
            <span className="text-[11px] text-ink-muted uppercase tracking-wider block mb-1">
              Submitted 12-Digit Transaction UTR
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-ink tracking-wider">
                {order.payment?.utr_number || "No UTR recorded"}
              </span>
              {order.payment?.utr_number && (
                <button
                  type="button"
                  onClick={handleCopyUtr}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink bg-surface border border-line rounded hover:bg-surface-subtle transition-colors"
                >
                  {copiedUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUtr ? "Copied" : "Copy UTR"}</span>
                </button>
              )}
            </div>
            {order.payment?.payer_vpa && (
              <p className="text-xs text-ink-secondary mt-2">
                Payer UPI VPA: <span className="font-mono font-medium">{order.payment.payer_vpa}</span>
              </p>
            )}
          </div>

          {/* Screenshot Preview if available */}
          {order.payment?.screenshot_url && (
            <div>
              <span className="text-[11px] text-ink-muted uppercase tracking-wider block mb-1.5">
                Attached Payment Screenshot
              </span>
              <div className="border border-line rounded p-2 bg-surface-subtle text-center">
                <a
                  href={order.payment.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block relative group"
                >
                  <img
                    src={order.payment.screenshot_url}
                    alt="Payment Screenshot"
                    className="max-h-48 rounded mx-auto border border-line object-contain"
                  />
                  <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-surface text-xs font-medium gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full View</span>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Expected vs Received Amount */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-surface-subtle border border-line rounded">
              <span className="text-[11px] text-ink-muted uppercase block">Amount Due</span>
              <span className="font-mono text-base font-bold text-ink">₹{expectedAmount.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-surface border border-line rounded">
              <label className="text-[11px] text-ink-muted uppercase block mb-1">
                Amount Confirmed (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-2 py-1 font-mono text-sm font-bold text-accent border border-line rounded focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {hasMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Amount Mismatch Warning</p>
                <p>
                  Calculated order cost is ₹{expectedAmount.toFixed(2)}, but confirmed amount is entered as ₹{numReceived.toFixed(2)}. This discrepancy will be logged in the permanent audit trail.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {/* Rejection Input Box if user toggled reject */}
          {showRejectBox && (
            <div className="p-3 bg-red-50/50 border border-red-200 rounded space-y-2">
              <label className="block text-xs font-semibold text-red-900">
                Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. UTR not found on bank statement. Please verify and re-submit."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-red-300 rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="text-[11px] text-red-700">
                The student will see this reason on their tracking screen and will be allowed to submit a new UTR.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1 text-xs border border-line rounded text-ink-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="px-3 py-1 text-xs font-semibold bg-red-700 text-surface rounded hover:bg-red-800 disabled:opacity-40"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showRejectBox && (
            <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRejectBox(true)}
                className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Payment</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-accent hover:bg-accent-hover text-surface rounded text-xs font-semibold shadow-subtle flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
