import React, { useEffect, useState } from "react";
import { OrderDetail } from "../../types";
import { api } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import {
  CheckCircle2,
  Clock,
  Printer,
  MapPin,
  RefreshCw,
  Receipt,
} from "lucide-react";

interface Step6Props {
  initialOrder: OrderDetail;
  onReset: () => void;
}

export const Step6Confirmation: React.FC<Step6Props> = ({
  initialOrder,
  onReset,
}) => {
  const [order, setOrder] = useState<OrderDetail>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Live polling with visibility detection
  useEffect(() => {
    let timerId: any = null;
    let pollCount = 0;

    const poll = async () => {
      if (document.hidden) return; // Respect tab visibility
      try {
        const updated = await api.getOrder(order.order_id, order.student.mobile_number);
        setOrder(updated);
      } catch (err) {
        console.error("Poll error:", err);
      }

      pollCount++;
      // Backoff: 4s for first 20 polls (~80s), then 8s
      const delay = pollCount > 20 ? 8000 : 4000;
      if (order.print_status !== "Completed" && order.payment_status !== "Successful") {
        timerId = setTimeout(poll, delay);
      }
    };

    timerId = setTimeout(poll, 4000);

    const onVisibilityChange = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [order.order_id, order.print_status, order.payment_status, order.student.mobile_number]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await api.getOrder(order.order_id, order.student.mobile_number);
      setOrder(updated);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const isPaid = order.payment_status === "Successful";

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      {/* Status Header Box */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 text-center shadow-card border border-line mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm ${
          isPaid 
            ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
            : "bg-amber-100 text-amber-800 border-amber-300"
        }`}>
          {isPaid ? <CheckCircle2 className="w-7 h-7 text-emerald-700" /> : <Clock className="w-7 h-7 text-amber-700" />}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          {isPaid ? "Payment Confirmed!" : "Payment Submitted"}
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 max-w-md mx-auto leading-relaxed">
          {isPaid
            ? "Your project report is queued and ready for printing at the station."
            : "The administrator is verifying your UTR against the bank statement. This status updates automatically."}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <StatusBadge status={order.payment_status} type="payment" />
          <StatusBadge status={order.print_status} type="print" />
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-surface-subtle text-ink-muted hover:text-ink rounded-lg border border-line transition-all shadow-xs ml-1 active:scale-[0.98]"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Official Receipt Card (Printable) */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line print:border-none print:shadow-none mb-6">
        <div className="flex items-start justify-between pb-5 border-b border-line mb-5">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-1">
              <Receipt className="w-3.5 h-3.5 text-accent" />
              <span>Official Digital Receipt</span>
            </div>
            <span className="text-xl font-bold font-mono text-ink block">{order.order_id}</span>
          </div>
          <span className="text-xs font-mono text-ink-muted bg-surface-subtle px-2.5 py-1 rounded-lg border border-line">
            {new Date(order.created_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs pb-5 border-b border-line">
          <div>
            <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Student Name</span>
            <span className="font-semibold text-ink text-sm">{order.student.full_name}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Enrollment Number</span>
            <span className="font-mono font-bold text-ink text-sm">{order.student.enrollment_number}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Report Filename</span>
            <span className="font-medium text-ink truncate block mt-0.5">{order.report.original_filename}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Pages & Duplex Sheets</span>
            <span className="font-mono text-ink font-medium mt-0.5 block">
              {order.report.page_count} Pages ({order.report.breakdown.normal_sheets + order.report.breakdown.special_sheets} Sheets)
            </span>
          </div>
          {order.payment?.utr_number && (
            <div className="col-span-2 pt-1">
              <span className="text-[10px] font-bold text-ink-muted block uppercase tracking-wider">Submitted UTR Number</span>
              <span className="font-mono font-bold text-accent text-sm mt-0.5 block">{order.payment.utr_number}</span>
            </div>
          )}
        </div>

        {/* Financial Breakdown Table */}
        <div className="py-5 space-y-2.5 text-xs border-b border-line">
          <div className="flex justify-between text-ink-secondary">
            <span>Special Paper (Page 1 + Extra Blank End Sheet)</span>
            <span className="font-mono font-semibold">₹20.00</span>
          </div>
          <div className="flex justify-between text-ink-secondary">
            <span>Colour Duplex Printing ({order.report.breakdown.colour_pages} sides @ ₹5)</span>
            <span className="font-mono font-semibold">
              ₹{Number(order.report.breakdown.colour_printing_cost).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-line text-sm sm:text-base font-bold text-ink">
            <span>Total Amount Paid</span>
            <span className="font-mono text-xl font-extrabold text-accent">
              ₹{Number(order.report.breakdown.total_amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Collection Instructions */}
        <div className="pt-5 flex items-start gap-3 text-xs text-ink-secondary">
          <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0 border border-accent/20">
            <MapPin className="w-4 h-4 text-accent" />
          </div>
          <div>
            <span className="font-bold text-ink block mb-0.5">Collection Instructions</span>
            <p className="leading-relaxed">{order.collection_instructions}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrintReceipt}
          className="min-h-[48px] px-5 py-2.5 border border-line hover:bg-surface-subtle rounded-xl text-xs sm:text-sm font-semibold text-ink transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Receipt PDF</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="min-h-[48px] px-5 py-2.5 bg-surface border border-line hover:bg-surface-subtle rounded-xl text-xs sm:text-sm font-semibold text-ink-secondary hover:text-ink transition-all shadow-xs active:scale-[0.98]"
        >
          Done / Submit Another Report
        </button>
      </div>
    </div>
  );
};
