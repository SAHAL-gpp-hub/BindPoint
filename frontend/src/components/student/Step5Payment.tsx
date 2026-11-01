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
  Lock,
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
        width: 280,
        margin: 1,
        color: {
          dark: "#0F3D2E",
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
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-subtle text-accent border border-accent/20">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span>Secure UPI Checkout</span>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-surface border border-line text-ink shadow-xs">
            {order.order_id}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-3">
          Payment & Verification
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 leading-relaxed">
          Pay exact amount via any UPI app (GPay, PhonePe, Paytm, BHIM) and enter the 12-digit bank UTR to initiate dispatch.
        </p>
      </div>

      {/* Rejection Notice if student is resubmitting */}
      {order.payment?.rejection_reason && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm shadow-xs">
          <p className="font-bold text-amber-950 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Previous Submission Needs Attention
          </p>
          <p className="mt-1 text-amber-800 leading-relaxed">{order.payment.rejection_reason}</p>
          <p className="mt-2 text-[11px] text-amber-900 font-semibold bg-amber-100/70 p-2 rounded-lg border border-amber-200">
            Please check your bank/UPI transaction history and submit the correct 12-digit UTR below.
          </p>
        </div>
      )}

      {/* Order Summary & Payable Amount Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-card border border-line mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-line text-xs">
          <div>
            <p className="font-bold text-ink text-sm sm:text-base">{order.student.full_name}</p>
            <p className="text-ink-muted font-mono font-medium text-xs mt-0.5">{order.student.enrollment_number}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Amount Due</span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-accent tabular-nums">
              ₹{amountStr}
            </span>
          </div>
        </div>
        <div className="pt-3 flex items-center justify-between text-xs text-ink-secondary">
          <span className="truncate max-w-[220px] sm:max-w-sm">{order.report.original_filename}</span>
          <span className="font-mono font-semibold shrink-0 bg-surface-subtle px-2 py-0.5 rounded border border-line">
            {order.report.page_count} Pages
          </span>
        </div>
      </div>

      {/* Payment Layout: Responsive Mobile / Desktop split */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line space-y-6">
        {/* MOBILE PRIMARY ACTION */}
        <div className="sm:hidden space-y-3">
          <a
            href={order.upi_deep_link}
            className="w-full min-h-[48px] bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-sm font-bold py-3 px-4 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Smartphone className="w-4 h-4" />
            <span>Pay ₹{amountStr} with UPI App</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrMobile(!showQrMobile)}
              className="flex-1 py-2 px-3 border border-line rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink bg-surface flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrMobile ? "Hide QR Code" : "Show QR Instead"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUpi}
              className="py-2 px-3 border border-line rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink bg-surface flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
            </button>
          </div>

          {showQrMobile && qrDataUrl && (
            <div className="p-4 bg-surface-subtle border border-line rounded-xl text-center">
              <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto border border-line rounded-lg p-2 bg-surface shadow-xs" />
              <p className="text-xs font-medium text-ink-muted mt-2">Scan with any UPI app to pay ₹{amountStr}</p>
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: High-Contrast QR Code alongside Details */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-6 items-center">
          <div className="text-center p-5 bg-canvas-subtle border border-line rounded-xl flex flex-col items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan UPI QR Code"
                className="w-48 h-48 border border-line rounded-xl p-2.5 bg-surface shadow-md"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-ink-muted">
                Generating QR...
              </div>
            )}
            <p className="text-xs font-bold text-ink mt-3">Scan with Any UPI App</p>
            <p className="text-[11px] text-ink-muted">Google Pay, PhonePe, Paytm, BHIM</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                UPI ID (VPA)
              </span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs font-bold text-ink bg-surface-subtle px-3 py-2 rounded-lg border border-line flex-1 truncate shadow-xs">
                  {order.upi_id}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-2 border border-line rounded-lg hover:bg-surface-subtle text-ink-secondary shadow-xs transition-all"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Payee Name
              </span>
              <p className="font-semibold text-ink text-sm">{order.payee_name}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                Exact Amount
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-accent">₹{amountStr}</span>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="p-1.5 border border-line rounded-lg hover:bg-surface-subtle text-ink-secondary shadow-xs transition-all"
                  title="Copy Amount"
                >
                  {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RETURN AND SUBMIT STEP: Frictionless, Impossible to Miss */}
        <div className="border-t border-line pt-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Step 2: Submit 12-Digit UTR / Ref No.</span>
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              After completing the payment in your UPI app, enter the 12-digit UTR from your bank transaction details to complete the submission.
            </p>
          </div>

          <form onSubmit={handleUtrSubmit} className="space-y-4">
            {/* UTR Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-ink uppercase tracking-wider">
                  12-Digit Transaction UTR <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  utrNumber.replace(/\D/g, "").length === 12 ? "text-emerald-700" : "text-ink-muted"
                }`}>
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
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-xl text-sm font-mono tracking-wider text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs transition-all"
              />
              <p className="text-[11px] text-ink-muted mt-1.5">
                Found as "UPI Ref No", "UTR", or "Bank Reference Number" in your payment details.
              </p>
            </div>

            {/* Optional Payer UPI ID */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Your UPI ID (Optional)
              </label>
              <input
                type="text"
                placeholder="yourname@okaxis"
                value={payerVpa}
                onChange={(e) => setPayerVpa(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs transition-all"
              />
            </div>

            {/* Optional Screenshot Upload */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
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
                  className="text-xs text-ink-secondary file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border file:border-line file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface cursor-pointer"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || utrNumber.replace(/\D/g, "").length !== 12}
              className="w-full min-h-[48px] bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
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
