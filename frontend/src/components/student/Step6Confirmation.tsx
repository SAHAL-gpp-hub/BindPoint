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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Status Header Box */}
      <div className="bg-surface border border-line rounded-md p-6 text-center shadow-subtle mb-6">
        <div className="w-12 h-12 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
          {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6 text-amber-700" />}
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          {isPaid ? "Payment Confirmed!" : "Payment Submitted"}
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-md mx-auto">
          {isPaid
            ? "Your project report is queued and ready for printing at the station."
            : "The administrator is verifying your UTR against the bank statement. This status updates automatically."}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge status={order.payment_status} type="payment" />
          <StatusBadge status={order.print_status} type="print" />
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-surface-subtle text-ink-muted hover:text-ink rounded transition-colors ml-1"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Official Receipt Card (Printable) */}
      <div className="bg-surface border border-line rounded-md p-6 shadow-subtle print:border-none print:shadow-none mb-6">
        <div className="flex items-start justify-between pb-4 border-b border-line mb-4">
          <div>
            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">
              Official Digital Receipt
            </span>
            <span className="text-lg font-bold font-mono text-ink">{order.order_id}</span>
          </div>
          <span className="text-xs font-mono text-ink-muted">
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
        <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-line">
          <div>
            <span className="text-[11px] text-ink-muted block uppercase">Student Name</span>
            <span className="font-semibold text-ink">{order.student.full_name}</span>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block uppercase">Enrollment Number</span>
            <span className="font-mono font-medium text-ink">{order.student.enrollment_number}</span>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block uppercase">Report Filename</span>
            <span className="font-medium text-ink truncate block">{order.report.original_filename}</span>
          </div>
          <div>
            <span className="text-[11px] text-ink-muted block uppercase">Pages & Duplex Sheets</span>
            <span className="font-mono text-ink">
              {order.report.page_count} Pages ({order.report.breakdown.normal_sheets + order.report.breakdown.special_sheets} Sheets)
            </span>
          </div>
          {order.payment?.utr_number && (
            <div className="col-span-2">
              <span className="text-[11px] text-ink-muted block uppercase">Submitted UTR Number</span>
              <span className="font-mono font-semibold text-ink">{order.payment.utr_number}</span>
            </div>
          )}
        </div>

        {/* Financial Breakdown Table */}
        <div className="py-4 space-y-2 text-xs border-b border-line">
          <div className="flex justify-between text-ink-secondary">
            <span>Special Paper (Page 1 + Extra Blank End Sheet)</span>
            <span className="font-mono">₹20.00</span>
          </div>
          <div className="flex justify-between text-ink-secondary">
            <span>Colour Duplex Printing ({order.report.breakdown.colour_pages} sides @ ₹5)</span>
            <span className="font-mono">
              ₹{Number(order.report.breakdown.colour_printing_cost).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-line text-sm font-bold text-ink">
            <span>Total Amount Paid</span>
            <span className="font-mono text-accent">
              ₹{Number(order.report.breakdown.total_amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Collection Instructions */}
        <div className="pt-4 flex items-start gap-2.5 text-xs text-ink-secondary">
          <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink block mb-0.5">Collection Instructions</span>
            <p className="leading-relaxed">{order.collection_instructions}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrintReceipt}
          className="min-h-[44px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded text-xs sm:text-sm font-medium text-ink transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Receipt PDF</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="min-h-[44px] px-4 py-2.5 bg-surface border border-line hover:bg-surface-subtle rounded text-xs sm:text-sm font-medium text-ink-secondary transition-colors"
        >
          Done / Submit Another Report
        </button>
      </div>
    </div>
  );
};
