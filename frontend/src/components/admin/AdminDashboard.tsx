import React, { useState, useEffect } from "react";
import { OrderListItem, DashboardMetrics, OrderDetail } from "../../types";
import { api } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { PaymentVerificationModal } from "./PaymentVerificationModal";
import { AdminOrderDetailModal } from "./AdminOrderDetailModal";
import { BatchesModal } from "./BatchesModal";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileArchive,
  RefreshCw,
  LogOut,
  Layers,
  Eye,
  FileText,
  Calendar,
  X,
} from "lucide-react";

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [printFilter, setPrintFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [orderDir, setOrderDir] = useState<string>("desc");

  // Selection for bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Modal states
  const [inspectOrder, setInspectOrder] = useState<OrderDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showBatchesModal, setShowBatchesModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, o] = await Promise.all([
        api.getDashboardMetrics(),
        api.listOrders({
          q: searchQuery || undefined,
          payment_status: paymentFilter || undefined,
          print_status: printFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          limit: 25,
          sort_by: sortBy,
          order_dir: orderDir,
        }),
      ]);
      setMetrics(m);
      setOrders(o.items);
      setTotalCount(o.total);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, paymentFilter, printFilter, dateFrom, dateTo, page, sortBy, orderDir]);

  const handleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map((o) => o.order_id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk stats calculation
  const selectedOrders = orders.filter((o) => selectedOrderIds.has(o.order_id));
  const selectedTotalPages = selectedOrders.reduce((sum, o) => sum + o.page_count, 0);
  const selectedTotalAmount = selectedOrders.reduce((sum, o) => sum + o.total_amount, 0);

  const handleExportZip = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsExporting(true);
    try {
      const blob = await api.exportBatchZip(Array.from(selectedOrderIds));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Print_Station_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export ZIP file.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateBatch = async () => {
    if (selectedOrderIds.size === 0) return;
    try {
      await api.createBatch(Array.from(selectedOrderIds));
      setSelectedOrderIds(new Set());
      await loadData();
      setShowBatchesModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to create printing batch.");
    }
  };

  const handleOpenPaymentVerify = async (orderId: string) => {
    try {
      const detail = await api.getAdminOrderDetail(orderId);
      setInspectOrder(detail);
      setShowPaymentModal(true);
    } catch (err: any) {
      alert("Could not load order details.");
    }
  };

  const handleOpenOrderDetail = async (orderId: string) => {
    try {
      const detail = await api.getAdminOrderDetail(orderId);
      setDetailOrder(detail);
      setShowDetailModal(true);
    } catch (err: any) {
      alert("Could not load order details.");
    }
  };

  const handlePrintStatusChange = async (orderId: string, nextStatus: string) => {
    try {
      await api.updatePrintStatus(orderId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update print status.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Admin Subheader with Title & Quick Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <span>Print Station Operations</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-surface border border-line text-ink-muted shadow-xs">
              Live Console
            </span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Bulk printing management, manual UPI verification queue, and student order dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Batches Console Trigger Button */}
          <button
            type="button"
            onClick={() => setShowBatchesModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-accent to-accent-light text-surface rounded-xl text-xs font-semibold hover:from-accent-hover hover:to-accent transition-all shadow-md shadow-accent/20 cursor-pointer active:scale-[0.98]"
          >
            <Layers className="w-4 h-4" />
            <span>Batches Console</span>
          </button>

          <a
            href="/api/v1/admin/export/csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-line rounded-xl text-xs font-semibold text-ink hover:bg-surface-subtle transition-all shadow-xs active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </a>

          <a
            href="/api/v1/admin/export/xlsx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-line rounded-xl text-xs font-semibold text-ink hover:bg-surface-subtle transition-all shadow-xs active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel (XLSX)</span>
          </a>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-line rounded-xl text-xs font-semibold text-ink hover:bg-surface-subtle transition-all shadow-xs active:scale-[0.98]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-line rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-all shadow-xs active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-stone-300" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Submissions</span>
            <span className="text-xl font-bold font-mono text-ink tabular-nums mt-0.5 block">{metrics.total_submissions}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-400" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Pending Pay</span>
            <span className="text-xl font-bold font-mono text-amber-700 tabular-nums mt-0.5 block">{metrics.pending_payments}</span>
          </div>

          <div className="bg-amber-50/80 border border-amber-300 p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-600" />
            <span className="text-[10px] font-mono text-amber-900 font-bold uppercase block">Verify Queue</span>
            <span className="text-xl font-bold font-mono text-amber-950 tabular-nums mt-0.5 block">{metrics.verification_required_payments}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Confirmed</span>
            <span className="text-xl font-bold font-mono text-emerald-800 tabular-nums mt-0.5 block">{metrics.confirmed_payments}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Ready to Print</span>
            <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-0.5 block">{metrics.ready_for_printing}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-blue-500" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Printing</span>
            <span className="text-xl font-bold font-mono text-blue-700 tabular-nums mt-0.5 block">{metrics.currently_printing}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-teal-500" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Completed</span>
            <span className="text-xl font-bold font-mono text-teal-800 tabular-nums mt-0.5 block">{metrics.completed_reports}</span>
          </div>

          <div className="bg-surface border border-line p-3.5 rounded-xl shadow-card relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="absolute top-0 inset-x-0 h-1 bg-accent" />
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">Confirmed Rev</span>
            <span className="text-xl font-bold font-mono text-accent tabular-nums mt-0.5 block">₹{Number(metrics.total_confirmed_revenue).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar with Date Range Inputs */}
      <div className="glass-card border border-line p-4 sm:p-5 rounded-2xl mb-5 flex flex-col gap-3 shadow-card">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, enrollment, order ID, or UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs transition-all"
            />
          </div>

          {/* Submission Date Filter (From / To) */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 bg-surface border border-line rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span className="text-[10px] uppercase font-mono font-bold text-ink-muted">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs text-ink bg-transparent focus:outline-none cursor-pointer"
                title="Filter From Submission Date"
              />
              {dateFrom && (
                <button
                  type="button"
                  onClick={() => setDateFrom("")}
                  className="text-ink-muted hover:text-ink p-0.5 ml-1 rounded hover:bg-surface-subtle"
                  title="Clear From Date"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-surface border border-line rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span className="text-[10px] uppercase font-mono font-bold text-ink-muted">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs text-ink bg-transparent focus:outline-none cursor-pointer"
                title="Filter To Submission Date"
              />
              {dateTo && (
                <button
                  type="button"
                  onClick={() => setDateTo("")}
                  className="text-ink-muted hover:text-ink p-0.5 ml-1 rounded hover:bg-surface-subtle"
                  title="Clear To Date"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Dropdowns and Sorting */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-3 border-t border-line/70">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs"
          >
            <option value="">All Payments</option>
            <option value="Verification Required">Verification Required (Queue)</option>
            <option value="Successful">Successful</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={printFilter}
            onChange={(e) => setPrintFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs"
          >
            <option value="">All Print Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Ready for Printing">Ready for Printing</option>
            <option value="Printing">Printing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={`${sortBy}-${orderDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split("-");
              setSortBy(f);
              setOrderDir(d);
            }}
            className="px-3 py-2 bg-surface border border-line rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="enrollment-asc">Enrollment (A-Z)</option>
            <option value="name-asc">Student Name (A-Z)</option>
            <option value="amount-desc">Amount (Highest)</option>
          </select>

          {(dateFrom || dateTo || searchQuery || paymentFilter || printFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPaymentFilter("");
                setPrintFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-ink-muted hover:text-ink font-semibold underline ml-auto cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="glass-card border border-line rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle/80 border-b border-line text-ink-secondary">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-line text-accent focus:ring-accent cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Order ID</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Student Details</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Pages / Cost</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Payment Status</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Print Status</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">UTR Reference</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
                    <span className="font-medium text-xs">Loading order records...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted font-medium text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isSelected = selectedOrderIds.has(order.order_id);
                  const isVerifReq = order.payment_status === "Verification Required";

                  return (
                    <tr
                      key={order.order_id}
                      className={`hover:bg-surface-subtle/70 transition-colors ${
                        isSelected ? "bg-accent-subtle/50" : ""
                      } ${isVerifReq ? "bg-amber-50/30" : ""}`}
                    >
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.order_id)}
                          className="w-4 h-4 rounded border-line text-accent focus:ring-accent cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3.5 font-mono font-bold text-ink">
                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetail(order.order_id)}
                          className="hover:underline text-accent font-bold text-left cursor-pointer"
                        >
                          {order.order_id}
                        </button>
                      </td>

                      <td className="py-3 px-3.5">
                        <div
                          className="font-bold text-ink hover:underline cursor-pointer text-xs"
                          onClick={() => handleOpenOrderDetail(order.order_id)}
                        >
                          {order.student_name}
                        </div>
                        <div className="font-mono text-[11px] text-ink-muted mt-0.5">
                          {order.enrollment_number} • {order.mobile_number}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-ink text-xs">₹{order.total_amount.toFixed(2)}</div>
                        <div className="font-mono text-[11px] text-ink-muted mt-0.5">
                          {order.page_count} Pages
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <StatusBadge status={order.payment_status} type="payment" />
                      </td>

                      <td className="py-3 px-3.5">
                        <StatusBadge status={order.print_status} type="print" />
                      </td>

                      <td className="py-3 px-3.5 font-mono">
                        {order.utr_number ? (
                          <span className="font-bold text-ink bg-surface-subtle px-2 py-1 rounded-md border border-line text-[11px] shadow-xs">
                            {order.utr_number}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Per-Order Detail View Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetail(order.order_id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface hover:bg-surface-subtle text-ink border border-line rounded-lg font-semibold text-[11px] transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                          title="View Full Student Details, Cost Breakdown, PDF Preview & Activity Log"
                        >
                          <Eye className="w-3.5 h-3.5 text-accent" />
                          <span>Detail</span>
                        </button>

                        {/* Direct Receipt PDF Download */}
                        <a
                          href={`/api/v1/admin/orders/${order.order_id}/receipt`}
                          download
                          className="inline-flex items-center p-1.5 rounded-lg hover:bg-surface-subtle text-ink-secondary hover:text-ink border border-line shadow-xs transition-all"
                          title="Download Official Receipt PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        </a>

                        {isVerifReq && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentVerify(order.order_id)}
                            className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                          >
                            Verify Pay
                          </button>
                        )}

                        {order.payment_status === "Successful" && (
                          <>
                            {order.print_status === "Ready for Printing" && (
                              <button
                                type="button"
                                onClick={() => handlePrintStatusChange(order.order_id, "Printing")}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-semibold text-[11px] shadow-xs cursor-pointer active:scale-[0.98]"
                              >
                                Mark Printing
                              </button>
                            )}
                            {order.print_status === "Printing" && (
                              <button
                                type="button"
                                onClick={() => handlePrintStatusChange(order.order_id, "Completed")}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-[11px] shadow-xs cursor-pointer active:scale-[0.98]"
                              >
                                Complete
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 bg-surface-subtle/80 border-t border-line flex items-center justify-between text-xs text-ink-muted">
          <span className="font-medium">Total records: {totalCount}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 border border-line rounded-lg hover:bg-surface disabled:opacity-40 font-semibold cursor-pointer shadow-xs transition-all"
            >
              Prev
            </button>
            <span className="font-mono font-bold text-ink px-1">Page {page}</span>
            <button
              type="button"
              disabled={orders.length < 25}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-line rounded-lg hover:bg-surface disabled:opacity-40 font-semibold cursor-pointer shadow-xs transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar at Screen Bottom when items are selected */}
      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-ink/95 backdrop-blur-md text-surface px-6 py-3.5 rounded-2xl shadow-2xl border border-line/30 flex items-center gap-4 text-xs">
          <span className="font-bold text-accent-subtle">
            {selectedOrderIds.size} Orders Selected
          </span>
          <span className="text-surface/40">•</span>
          <span className="font-mono">{selectedTotalPages} Pages</span>
          <span className="text-surface/40">•</span>
          <span className="font-mono font-bold text-emerald-400">₹{selectedTotalAmount.toFixed(2)}</span>

          <div className="flex items-center gap-2.5 ml-3">
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-3.5 py-1.5 bg-surface text-ink font-bold rounded-xl hover:bg-surface-subtle flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>

            <button
              type="button"
              onClick={handleCreateBatch}
              className="px-3.5 py-1.5 bg-gradient-to-r from-accent to-accent-light text-surface font-bold rounded-xl hover:from-accent-hover hover:to-accent flex items-center gap-1.5 shadow-md shadow-accent/20 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Create Print Batch</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      <PaymentVerificationModal
        order={inspectOrder}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onStatusChanged={loadData}
      />

      {/* Comprehensive Per-Order Detail Modal */}
      <AdminOrderDetailModal
        order={detailOrder}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onStatusChanged={loadData}
      />

      {/* Batches Management Modal */}
      <BatchesModal
        isOpen={showBatchesModal}
        onClose={() => setShowBatchesModal(false)}
        onBatchUpdated={loadData}
      />
    </div>
  );
};
