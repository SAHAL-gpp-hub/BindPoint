import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { OrderDetail } from "../../types";
import { api } from "../../lib/api";
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface Step5Props {
  order: OrderDetail;
  onPaymentSubmitted: (updatedOrder: OrderDetail) => void;
}

export const Step5Payment: React.FC<Step5Props> = ({
  order,
  onPaymentSubmitted,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrMobile, setShowQrMobile] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);

  // UTR submission state
  const [utrNumber, setUtrNumber] = useState<string>(order.payment?.utr_number || "");
  const [payerVpa, setPayerVpa] = useState<string>(order.payment?.payer_vpa || "");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate QR Code data URL
  useEffect(() => {
    if (order.qr_data) {
      QRCode.toDataURL(order.qr_data, {
        width: 260,
        margin: 1,
        color: {
          dark: "#144A38",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating QR:", err));
    }
  }, [order.qr_data]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(order.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(Number(order.report.breakdown.total_amount).toFixed(2));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMsg("Transaction UTR must be exactly 12 numeric digits (from your UPI receipt).");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const updated = await api.submitPayment(
        order.order_id,
        cleanUtr,
        payerVpa.trim() || undefined,
        screenshotFile || undefined
      );
      onPaymentSubmitted(updated);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit transaction details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountStr = Number(order.report.breakdown.total_amount).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Payment & Verification
          </h1>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-surface border border-line text-ink">
            {order.order_id}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Pay exact amount via any UPI app (GPay, PhonePe, Paytm, BHIM) and enter the 12-digit UTR.
        </p>
      </div>

      {/* Rejection Notice if student is resubmitting */}
      {order.payment?.rejection_reason && (
        <div className="mb-6 p-4 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm">
          <p className="font-semibold text-amber-950 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Previous Submission Needs Attention
          </p>
          <p className="mt-1 text-amber-800">{order.payment.rejection_reason}</p>
          <p className="mt-1.5 text-[11px] text-amber-700 font-medium">
            Please check your bank/UPI transaction history and submit the correct 12-digit UTR below.
          </p>
        </div>
      )}

      {/* Order Summary & Payable Amount Card */}
      <div className="bg-surface border border-line rounded-md p-4 sm:p-5 shadow-subtle mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-line text-xs">
          <div>
            <p className="font-semibold text-ink">{order.student.full_name}</p>
            <p className="text-ink-muted font-mono">{order.student.enrollment_number}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-ink-muted block uppercase">Amount Due</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-accent tabular-nums">
              ₹{amountStr}
            </span>
          </div>
        </div>
        <div className="pt-3 flex items-center justify-between text-xs text-ink-secondary">
          <span className="truncate max-w-[220px] sm:max-w-sm">{order.report.original_filename}</span>
          <span className="font-mono shrink-0">{order.report.page_count} Pages</span>
        </div>
      </div>

      {/* Payment Layout: Responsive Mobile / Desktop split */}
      <div className="bg-surface border border-line rounded-md p-5 shadow-subtle space-y-6">
        {/* MOBILE PRIMARY ACTION */}
        <div className="sm:hidden space-y-3">
          <a
            href={order.upi_deep_link}
            className="w-full min-h-[48px] bg-accent hover:bg-accent-hover text-surface text-sm font-semibold py-3 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Pay ₹{amountStr} with UPI App</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrMobile(!showQrMobile)}
              className="flex-1 py-2 px-3 border border-line rounded text-xs font-medium text-ink-secondary hover:text-ink flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrMobile ? "Hide QR Code" : "Show QR Instead"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUpi}
              className="py-2 px-3 border border-line rounded text-xs font-medium text-ink-secondary hover:text-ink flex items-center justify-center gap-1.5"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
            </button>
          </div>

          {showQrMobile && qrDataUrl && (
            <div className="p-4 bg-surface-subtle border border-line rounded text-center">
              <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto border border-line rounded p-2 bg-surface" />
              <p className="text-[11px] text-ink-muted mt-2">Scan with any UPI app to pay ₹{amountStr}</p>
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: High-Contrast QR Code alongside Details */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-6 items-center">
          <div className="text-center p-4 bg-surface-subtle border border-line rounded flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan UPI QR Code"
                className="w-48 h-48 border border-line rounded p-2 bg-surface shadow-subtle"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-ink-muted">
                Generating QR...
              </div>
            )}
            <p className="text-xs font-medium text-ink mt-2">Scan with Any UPI App</p>
            <p className="text-[11px] text-ink-muted">Google Pay, PhonePe, Paytm, BHIM</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[11px] text-ink-muted uppercase tracking-wider block mb-1">
                UPI ID (VPA)
              </span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs font-semibold text-ink bg-surface-subtle px-2.5 py-1.5 rounded border border-line flex-1 truncate">
                  {order.upi_id}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1.5 border border-line rounded hover:bg-surface-subtle text-ink-secondary"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-ink-muted uppercase tracking-wider block mb-1">
                Payee Name
              </span>
              <p className="font-medium text-ink">{order.payee_name}</p>
            </div>

            <div>
              <span className="text-[11px] text-ink-muted uppercase tracking-wider block mb-1">
                Exact Amount
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-accent">₹{amountStr}</span>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="p-1 border border-line rounded hover:bg-surface-subtle text-ink-secondary"
                  title="Copy Amount"
                >
                  {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RETURN AND SUBMIT STEP: Frictionless, Impossible to Miss */}
        <div className="border-t border-line pt-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Step 2: Submit 12-Digit UTR / Ref No.</span>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              After completing the payment in your UPI app, enter the 12-digit UTR from your payment receipt.
            </p>
          </div>

          <form onSubmit={handleUtrSubmit} className="space-y-4">
            {/* UTR Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink">
                  12-Digit Transaction UTR <span className="text-red-600">*</span>
                </label>
                <span className="text-[11px] font-mono text-ink-muted">
                  {utrNumber.replace(/\D/g, "").length}/12 digits
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                required
                placeholder="e.g. 430123456789"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                  setErrorMsg(null);
                }}
                className="w-full px-3 py-2.5 bg-surface border border-line rounded text-sm font-mono tracking-wider text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Found as "UPI Ref No", "UTR", or "Bank Reference Number" in your payment details.
              </p>
            </div>

            {/* Optional Payer UPI ID */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Your UPI ID (Optional)
              </label>
              <input
                type="text"
                placeholder="yourname@okaxis"
                value={payerVpa}
                onChange={(e) => setPayerVpa(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-line rounded text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Optional Screenshot Upload */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Payment Screenshot (Optional, Image only)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setScreenshotFile(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-ink-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded file:border file:border-line file:text-xs file:font-medium file:bg-surface-subtle file:text-ink hover:file:bg-surface"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || utrNumber.replace(/\D/g, "").length !== 12}
              className="w-full min-h-[48px] bg-accent hover:bg-accent-hover active:bg-accent text-surface text-sm font-medium py-3 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Transaction...</span>
                </>
              ) : (
                <>
                  <span>Submit Payment for Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
