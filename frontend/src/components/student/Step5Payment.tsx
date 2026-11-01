import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { OrderDetail } from "../../types";
import { api } from "../../lib/api";
import {
  QrCode,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
} from "lucide-react";

interface Step5Props {
  order: OrderDetail;
  onPaymentSubmitted: (updatedOrder: OrderDetail) => void;
}

// Brand SVG Icons
const PhonePeIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#5F259F" />
    <path
      d="M29.5 16H23.8C24.4 14.8 24.8 13.5 24.8 12.2C24.8 11.5 24.3 11 23.6 11H20.4C20 11 19.6 11.2 19.4 11.6C18.1 14.3 16.3 16.7 14.2 18.7C13.8 19.1 13.6 19.6 13.6 20.1V22.2C13.6 22.8 14.1 23.3 14.7 23.3H17.8V35.8C17.8 36.5 18.3 37 19 37H22.6C23.3 37 23.8 36.5 23.8 35.8V23.3H29.5C30.2 23.3 30.7 22.8 30.7 22.2V17.1C30.7 16.5 30.2 16 29.5 16Z"
      fill="#FFFFFF"
    />
    <path
      d="M23.8 23.3H27.5C29 23.3 30.2 24.5 30.2 26V26.2C30.2 27.7 29 28.9 27.5 28.9H23.8V23.3Z"
      fill="#FFFFFF"
    />
  </svg>
);

const GPayIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
    <path
      d="M34.8 24.3c0-.7-.1-1.4-.2-2H24v4.2h6.1c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.4-5 3.4-8.4z"
      fill="#4285F4"
    />
    <path
      d="M24 35.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H13.8v2.9c2 3.9 6 6.4 10.2 6.4z"
      fill="#34A853"
    />
    <path
      d="M17.6 26.2c-.2-.7-.4-1.5-.4-2.2s.1-1.5.4-2.2v-2.9h-3.8c-.8 1.6-1.2 3.4-1.2 5.1s.4 3.5 1.2 5.1l3.8-2.9z"
      fill="#FBBC05"
    />
    <path
      d="M24 16.5c1.7 0 3.2.6 4.4 1.8l3.3-3.3c-2-1.9-4.7-3-7.7-3-4.2 0-8.2 2.5-10.2 6.4l3.8 2.9c.9-2.8 3.4-4.8 6.4-4.8z"
      fill="#EA4335"
    />
  </svg>
);

const PaytmIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
    <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="13">
      <tspan fill="#002970">Pay</tspan>
      <tspan fill="#00BAF2">tm</tspan>
    </text>
  </svg>
);

const FamPayIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="48" height="48" rx="10" fill="#F8B600" />
    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="13" fill="#111827">
      Fam
    </text>
  </svg>
);

const UpiGenericIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M14 3L7.5 13.5H13L10.5 21L18 10.5H12.5L14 3Z" fill="currentColor" />
  </svg>
);

export const Step5Payment: React.FC<Step5Props> = ({
  order,
  onPaymentSubmitted,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrMobile, setShowQrMobile] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // UTR submission state
  const [utrNumber, setUtrNumber] = useState<string>(order.payment?.utr_number || "");
  const [payerVpa, setPayerVpa] = useState<string>(order.payment?.payer_vpa || "");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountStr = Number(order.report.breakdown.total_amount).toFixed(2);

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

  // UPI deep link query parameters
  const upiQuery = order.upi_deep_link
    ? order.upi_deep_link.replace(/^upi:\/\/pay\??/, "")
    : `pa=${encodeURIComponent(order.upi_id)}&pn=${encodeURIComponent(order.payee_name)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(order.order_id)}`;

  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const getUpiUrl = (app: "phonepe" | "gpay" | "paytm" | "fampay" | "generic") => {
    if (isAndroid) {
      switch (app) {
        case "phonepe":
          return `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end`;
        case "gpay":
          return `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        case "paytm":
          return `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end`;
        case "fampay":
          return `intent://pay?${upiQuery}#Intent;scheme=in.fampay.app;package=in.fampay.app;end`;
        case "generic":
        default:
          return `upi://pay?${upiQuery}`;
      }
    } else if (isIOS) {
      switch (app) {
        case "phonepe":
          return `phonepe://pay?${upiQuery}`;
        case "gpay":
          return `gpay://upi/pay?${upiQuery}`;
        case "paytm":
          return `paytmmp://pay?${upiQuery}`;
        case "fampay":
          return `fampay://upi/pay?${upiQuery}`;
        case "generic":
        default:
          return `upi://pay?${upiQuery}`;
      }
    }
    // Fallback default
    switch (app) {
      case "phonepe":
        return `phonepe://pay?${upiQuery}`;
      case "gpay":
        return `gpay://upi/pay?${upiQuery}`;
      case "paytm":
        return `paytmmp://pay?${upiQuery}`;
      case "fampay":
        return `fampay://upi/pay?${upiQuery}`;
      default:
        return `upi://pay?${upiQuery}`;
    }
  };

  const handleAppLaunch = (appName: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAndroid && !isIOS) {
      // On desktop, copy UPI and guide user to mobile
      e.preventDefault();
      navigator.clipboard.writeText(order.upi_id);
      setCopiedUpi(true);
      setStatusNotification(`UPI app direct launch works on mobile devices. UPI ID copied! Scan the QR code or use your phone.`);
      setTimeout(() => {
        setCopiedUpi(false);
        setStatusNotification(null);
      }, 5000);
      return;
    }

    setStatusNotification(`Launching ${appName}... After paying, return here to submit your 12-digit UTR.`);
    setTimeout(() => setStatusNotification(null), 8000);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(order.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amountStr);
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
          Pay exact amount via PhonePe, Google Pay, Paytm, or FamPay, then enter the 12-digit bank UTR below.
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

      {/* Notification Toast / Feedback Banner */}
      {statusNotification && (
        <div className="mb-6 p-3 rounded-xl bg-accent-subtle border border-accent/30 text-accent text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Main Payment Container */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line space-y-6">
        
        {/* UPI APP SELECTOR: Prominent on both Mobile and Desktop */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <span>Step 1: Choose Your UPI App</span>
            </span>
            <span className="text-[11px] text-ink-muted font-medium">Bypasses WhatsApp</span>
          </div>

          {/* 4-App Grid: PhonePe, Google Pay, Paytm, FamPay */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* PhonePe */}
            <a
              href={getUpiUrl("phonepe")}
              onClick={(e) => handleAppLaunch("PhonePe", e)}
              className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-2.5 p-3 rounded-xl border border-line bg-surface hover:border-[#5F259F]/50 hover:bg-[#5F259F]/5 text-ink transition-all shadow-xs active:scale-[0.98] group"
            >
              <PhonePeIcon className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 rounded-lg shadow-2xs" />
              <div className="text-center sm:text-left min-w-0">
                <div className="text-xs font-bold text-ink group-hover:text-[#5F259F] transition-colors truncate">
                  PhonePe
                </div>
                <div className="text-[10px] text-ink-muted">Tap to pay</div>
              </div>
            </a>

            {/* Google Pay */}
            <a
              href={getUpiUrl("gpay")}
              onClick={(e) => handleAppLaunch("Google Pay", e)}
              className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-2.5 p-3 rounded-xl border border-line bg-surface hover:border-[#4285F4]/50 hover:bg-[#4285F4]/5 text-ink transition-all shadow-xs active:scale-[0.98] group"
            >
              <GPayIcon className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 rounded-lg shadow-2xs" />
              <div className="text-center sm:text-left min-w-0">
                <div className="text-xs font-bold text-ink group-hover:text-[#4285F4] transition-colors truncate">
                  Google Pay
                </div>
                <div className="text-[10px] text-ink-muted">Tap to pay</div>
              </div>
            </a>

            {/* Paytm */}
            <a
              href={getUpiUrl("paytm")}
              onClick={(e) => handleAppLaunch("Paytm", e)}
              className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-2.5 p-3 rounded-xl border border-line bg-surface hover:border-[#00BAF2]/50 hover:bg-[#00BAF2]/5 text-ink transition-all shadow-xs active:scale-[0.98] group"
            >
              <PaytmIcon className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 rounded-lg shadow-2xs" />
              <div className="text-center sm:text-left min-w-0">
                <div className="text-xs font-bold text-ink group-hover:text-[#002970] transition-colors truncate">
                  Paytm
                </div>
                <div className="text-[10px] text-ink-muted">Tap to pay</div>
              </div>
            </a>

            {/* FamPay */}
            <a
              href={getUpiUrl("fampay")}
              onClick={(e) => handleAppLaunch("FamPay", e)}
              className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-2.5 p-3 rounded-xl border border-line bg-surface hover:border-[#F8B600]/60 hover:bg-[#F8B600]/10 text-ink transition-all shadow-xs active:scale-[0.98] group"
            >
              <FamPayIcon className="w-9 h-9 sm:w-8 sm:h-8 shrink-0 rounded-lg shadow-2xs" />
              <div className="text-center sm:text-left min-w-0">
                <div className="text-xs font-bold text-ink group-hover:text-amber-800 transition-colors truncate">
                  FamPay
                </div>
                <div className="text-[10px] text-ink-muted">Tap to pay</div>
              </div>
            </a>
          </div>

          {/* Any Other UPI App Fallback Pill */}
          <div className="mt-2.5">
            <a
              href={getUpiUrl("generic")}
              onClick={(e) => handleAppLaunch("Any UPI App", e)}
              className="w-full py-2.5 px-3 rounded-xl border border-line bg-surface-subtle hover:bg-surface text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
            >
              <UpiGenericIcon className="w-3.5 h-3.5 text-accent" />
              <span>Other UPI Apps (CRED, BHIM, Amazon Pay, Axis)</span>
              <ExternalLink className="w-3 h-3 text-ink-muted ml-0.5" />
            </a>
          </div>
        </div>

        {/* Alternate Options Bar: Toggle QR & Copy UPI */}
        <div className="pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQrMobile(!showQrMobile)}
              className="flex-1 py-2 px-3 border border-line rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink bg-surface flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <QrCode className="w-3.5 h-3.5 text-accent" />
              <span>{showQrMobile ? "Hide QR Code" : "Show QR Code"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUpi}
              className="py-2 px-3 border border-line rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink bg-surface flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? "Copied" : "Copy UPI ID"}</span>
            </button>
          </div>

          {/* Collapsible/Expandable QR Code Section */}
          {(showQrMobile || !isAndroid && !isIOS) && (
            <div className="mt-4 p-5 bg-canvas-subtle border border-line rounded-xl flex flex-col sm:flex-row items-center gap-5">
              <div className="shrink-0 text-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan UPI QR Code"
                    className="w-40 h-40 border border-line rounded-xl p-2 bg-surface shadow-md mx-auto"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-xs text-ink-muted">
                    Generating QR...
                  </div>
                )}
                <span className="text-[11px] font-bold text-ink-muted mt-2 block">Scan with any phone</span>
              </div>

              <div className="space-y-3 text-xs w-full min-w-0">
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                    UPI ID (VPA)
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs font-bold text-ink bg-surface px-3 py-1.5 rounded-lg border border-line flex-1 truncate shadow-xs">
                      {order.upi_id}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1.5 border border-line rounded-lg hover:bg-surface-subtle text-ink-secondary shadow-xs transition-all"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                    Payee Name
                  </span>
                  <p className="font-semibold text-ink text-xs">{order.payee_name}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                    Exact Amount
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-accent">₹{amountStr}</span>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="p-1 border border-line rounded hover:bg-surface-subtle text-ink-secondary shadow-xs transition-all"
                      title="Copy Amount"
                    >
                      {copiedAmount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RETURN AND SUBMIT STEP: Frictionless, Impossible to Miss */}
        <div className="border-t border-line pt-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>Step 2: Submit 12-Digit UTR / Ref No.</span>
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              After completing the payment in PhonePe, Google Pay, Paytm, or FamPay, enter the 12-digit UTR from your transaction details.
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
