import React, { useState, useEffect } from "react";
import { OrderListItem, DashboardMetrics, OrderDetail } from "../../types";
import { api } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { PaymentVerificationModal } from "./PaymentVerificationModal";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileArchive,
  RefreshCw,
  LogOut,
  Layers,
  Eye,
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
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [orderDir, setOrderDir] = useState<string>("desc");

  // Selection for bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Modal states
  const [inspectOrder, setInspectOrder] = useState<OrderDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
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
  }, [searchQuery, paymentFilter, printFilter, page, sortBy, orderDir]);

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

  const handlePrintStatusChange = async (orderId: string, nextStatus: string) => {
    try {
      await api.updatePrintStatus(orderId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update print status.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Admin Subheader with Title & Quick Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>Print Station Operations</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-muted">
              Live Console
            </span>
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Bulk printing management, manual UPI verification queue, and student order dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/admin/export/csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded text-xs font-medium text-ink hover:bg-surface-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </a>

          <a
            href="/api/v1/admin/export/xlsx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded text-xs font-medium text-ink hover:bg-surface-subtle transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel (XLSX)</span>
          </a>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded text-xs font-medium text-ink hover:bg-surface-subtle transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-line rounded text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Submissions</span>
            <span className="text-lg font-bold font-mono text-ink tabular-nums">{metrics.total_submissions}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Pending Pay</span>
            <span className="text-lg font-bold font-mono text-amber-700 tabular-nums">{metrics.pending_payments}</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-300 p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-amber-900 font-semibold uppercase block">Verify Queue</span>
            <span className="text-lg font-bold font-mono text-amber-950 tabular-nums">{metrics.verification_required_payments}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Confirmed</span>
            <span className="text-lg font-bold font-mono text-emerald-800 tabular-nums">{metrics.confirmed_payments}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Ready to Print</span>
            <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums">{metrics.ready_for_printing}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Printing</span>
            <span className="text-lg font-bold font-mono text-blue-700 tabular-nums">{metrics.currently_printing}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Completed</span>
            <span className="text-lg font-bold font-mono text-teal-800 tabular-nums">{metrics.completed_reports}</span>
          </div>

          <div className="bg-surface border border-line p-3 rounded shadow-subtle col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">Confirmed Rev</span>
            <span className="text-lg font-bold font-mono text-accent tabular-nums">₹{Number(metrics.total_confirmed_revenue).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-line p-3 rounded-md mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-subtle">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name, enrollment, order ID, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-line rounded text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-surface border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-accent"
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
            className="px-2.5 py-1.5 bg-surface border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-accent"
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
            className="px-2.5 py-1.5 bg-surface border border-line rounded text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="enrollment-asc">Enrollment (A-Z)</option>
            <option value="name-asc">Student Name (A-Z)</option>
            <option value="amount-desc">Amount (Highest)</option>
          </select>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-surface border border-line rounded-md overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-line text-ink-secondary">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-line text-accent focus:ring-accent"
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Order ID</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Student Details</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Pages / Cost</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Payment Status</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Print Status</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">UTR Reference</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-accent" />
                    <span>Loading order records...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-muted">
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
                      className={`hover:bg-surface-subtle/60 transition-colors ${
                        isSelected ? "bg-accent-subtle/40" : ""
                      } ${isVerifReq ? "bg-amber-50/20" : ""}`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.order_id)}
                          className="w-3.5 h-3.5 rounded border-line text-accent focus:ring-accent"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-ink">
                        {order.order_id}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-medium text-ink">{order.student_name}</div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          {order.enrollment_number} • {order.mobile_number}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-ink">₹{order.total_amount.toFixed(2)}</div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          {order.page_count} Pages
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <StatusBadge status={order.payment_status} type="payment" />
                      </td>

                      <td className="py-2.5 px-3">
                        <StatusBadge status={order.print_status} type="print" />
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {order.utr_number ? (
                          <span className="font-medium text-ink bg-surface-subtle px-1.5 py-0.5 rounded border border-line">
                            {order.utr_number}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {isVerifReq && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentVerify(order.order_id)}
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] transition-colors"
                          >
                            Verify Pay
                          </button>
                        )}

                        <a
                          href={`/api/v1/admin/orders/${order.order_id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center p-1 rounded hover:bg-surface-subtle text-ink-secondary hover:text-ink border border-line"
                          title="Download Report PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>

                        {order.payment_status === "Successful" && (
                          <>
                            {order.print_status === "Ready for Printing" && (
                              <button
                                type="button"
                                onClick={() => handlePrintStatusChange(order.order_id, "Printing")}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px]"
                              >
                                Mark Printing
                              </button>
                            )}
                            {order.print_status === "Printing" && (
                              <button
                                type="button"
                                onClick={() => handlePrintStatusChange(order.order_id, "Completed")}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px]"
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
        <div className="py-2.5 px-4 bg-surface-subtle border-t border-line flex items-center justify-between text-xs text-ink-muted">
          <span>Total records: {totalCount}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-2 py-1 border border-line rounded hover:bg-surface disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-mono text-ink">Page {page}</span>
            <button
              type="button"
              disabled={orders.length < 25}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border border-line rounded hover:bg-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Bar at Screen Bottom when items are selected */}
      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-ink text-surface px-5 py-3 rounded-md shadow-2xl border border-line/40 flex items-center gap-4 text-xs">
          <span className="font-semibold text-accent-subtle">
            {selectedOrderIds.size} Orders Selected
          </span>
          <span className="text-surface/60">•</span>
          <span className="font-mono">{selectedTotalPages} Pages</span>
          <span className="text-surface/60">•</span>
          <span className="font-mono font-bold text-emerald-400">₹{selectedTotalAmount.toFixed(2)}</span>

          <div className="flex items-center gap-2 ml-2">
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-3 py-1.5 bg-surface text-ink font-semibold rounded hover:bg-surface-subtle flex items-center gap-1.5"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>

            <button
              type="button"
              onClick={handleCreateBatch}
              className="px-3 py-1.5 bg-accent text-surface font-semibold rounded hover:bg-accent-hover flex items-center gap-1.5"
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
    </div>
  );
};
