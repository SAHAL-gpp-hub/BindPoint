import React, { useState } from "react";
import { OrderDetail } from "../../types";
import { api, API_ORIGIN } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import {
  X,
  Download,
  Receipt,
  Printer,
  CheckCircle,
  Eye,
  User,
  CreditCard,
  History,
  AlertCircle,
} from "lucide-react";

interface AdminOrderDetailModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const AdminOrderDetailModal: React.FC<AdminOrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  if (!isOpen || !order) return null;

  const [activeTab, setActiveTab] = useState<"details" | "preview">("details");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePrintStatus = async (status: string) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await api.updatePrintStatus(order.order_id, status);
      onStatusChanged();
      // Reload order details in place
      const updated = await api.getAdminOrderDetail(order.order_id);
      Object.assign(order, updated);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update print status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const pdfUrl = `${API_ORIGIN}/api/v1/admin/orders/${order.order_id}/pdf`;
  const receiptUrl = `${API_ORIGIN}/api/v1/admin/orders/${order.order_id}/receipt`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-sm">
      <div className="glass-modal border border-line rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-subtle/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-base sm:text-lg font-bold text-ink">
              {order.order_id}
            </span>
            <StatusBadge status={order.payment_status} type="payment" />
            <StatusBadge status={order.print_status} type="print" />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex bg-surface border border-line rounded-xl p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === "details"
                    ? "bg-gradient-to-r from-accent to-accent-light text-surface shadow-xs"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Order Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-gradient-to-r from-accent to-accent-light text-surface shadow-xs"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>PDF Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface border border-line transition-all shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === "details" ? (
            <>
              {/* Full Student Information Card */}
              <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line">
                  <User className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Full Student Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-ink-muted block text-[10px] font-bold uppercase tracking-wider">Student Name</span>
                    <span className="font-bold text-ink text-sm sm:text-base">{order.student.full_name}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px] font-bold uppercase tracking-wider">Enrollment Number</span>
                    <span className="font-mono font-bold text-ink text-sm bg-surface-subtle px-2.5 py-1 rounded-lg border border-line inline-block mt-1 shadow-xs">
                      {order.student.enrollment_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[10px] font-bold uppercase tracking-wider">Mobile Number</span>
                    <span className="font-mono font-bold text-ink text-sm sm:text-base mt-0.5 block">{order.student.mobile_number}</span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown & Document Geometry Card */}
              <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-line">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Itemized Cost Breakdown & Document Specifications
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-ink-secondary truncate max-w-xs bg-surface-subtle px-2.5 py-1 rounded-lg border border-line">
                    {order.report.original_filename}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-line rounded-xl overflow-hidden">
                    <thead className="bg-surface-subtle border-b border-line text-ink-muted uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3.5">Item / Specification</th>
                        <th className="py-2.5 px-3.5 text-center">Quantity</th>
                        <th className="py-2.5 px-3.5 text-center">Unit Rate</th>
                        <th className="py-2.5 px-3.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink">
                      <tr>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-xs">Special Bond Paper (100 GSM)</span>
                          <span className="text-ink-muted block text-[11px] mt-0.5">
                            Page 1 front sheet & extra blank duplex balance sheets
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                          {order.report.breakdown.special_sheets} Sheet(s)
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono">₹10.00 / sheet</td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                          ₹{Number(order.report.breakdown.special_paper_cost).toFixed(2)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-xs">Normal Paper Duplex (75 GSM)</span>
                          <span className="text-ink-muted block text-[11px] mt-0.5">
                            Double-sided report body pages
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                          {order.report.breakdown.normal_sheets} Sheet(s)
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono">Included in duplex</td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold">₹0.00</td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5">
                          <span className="font-semibold text-xs">Colour Printing (Duplex Sides)</span>
                          <span className="text-ink-muted block text-[11px] mt-0.5">
                            Colour pages including Page 1 + {order.report.breakdown.colour_pages} internal colour pages
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                          {1 + order.report.breakdown.colour_pages} Printed Side(s)
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono">₹5.00 / side</td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                          ₹{Number(order.report.breakdown.colour_printing_cost).toFixed(2)}
                        </td>
                      </tr>

                      <tr className="bg-surface-subtle font-bold">
                        <td className="py-3 px-3.5 text-xs">
                          Total Payable Cost ({order.report.page_count} PDF Pages)
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold">
                          {order.report.breakdown.normal_sheets + order.report.breakdown.special_sheets} Sheets
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono">—</td>
                        <td className="py-3 px-3.5 text-right font-mono text-base font-extrabold text-accent">
                          ₹{Number(order.report.breakdown.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {order.payment?.utr_number && (
                  <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center justify-between text-xs">
                    <span className="text-ink-secondary">
                      12-Digit UTR: <strong className="font-mono font-bold text-ink">{order.payment.utr_number}</strong>
                    </span>
                    {order.payment.payer_vpa && (
                      <span className="text-ink-secondary">
                        Payer UPI: <strong className="font-mono font-bold text-ink">{order.payment.payer_vpa}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: PDF Download, Receipt PDF, Print Status */}
              <div className="bg-surface border border-line rounded-xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={pdfUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-subtle text-ink border border-line rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5 text-accent" />
                    <span>Download Report PDF</span>
                  </a>

                  <a
                    href={receiptUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-subtle text-ink border border-line rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Download Receipt PDF</span>
                  </a>
                </div>

                {/* Print Status Transition Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-muted">Print Status:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdatePrintStatus("Printing")}
                    disabled={isUpdating || order.print_status === "Printing"}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      order.print_status === "Printing"
                        ? "bg-blue-100 text-blue-900 border border-blue-300 opacity-60 cursor-default"
                        : "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer active:scale-[0.98]"
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Printing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdatePrintStatus("Completed")}
                    disabled={isUpdating || order.print_status === "Completed"}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      order.print_status === "Completed"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300 opacity-60 cursor-default"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer active:scale-[0.98]"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </button>
                </div>
              </div>

              {/* Activity Audit Timeline */}
              <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line">
                  <History className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Order Activity Timeline & Audit Trail
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {order.timeline.length === 0 ? (
                    <p className="text-xs text-ink-muted">No timeline entries recorded yet.</p>
                  ) : (
                    order.timeline.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0 shadow-xs" />
                        <div className="flex-1 bg-surface-subtle/50 p-2.5 rounded-xl border border-line/60">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ink">
                              {item.to_state ? `Status: ${item.to_state}` : "Event Logged"}
                            </span>
                            <span className="text-[11px] font-mono text-ink-muted font-medium">
                              {new Date(item.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-ink-secondary mt-1 leading-relaxed text-xs">{item.note}</p>
                          )}
                          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase mt-1 block">
                            Actor: {item.actor_type}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* PDF Preview View */
            <div className="h-[650px] w-full border border-line rounded-xl overflow-hidden bg-surface-subtle flex flex-col shadow-card">
              <div className="p-3 bg-surface border-b border-line flex items-center justify-between text-xs">
                <span className="text-ink font-bold truncate">
                  Previewing: {order.report.original_filename} ({order.report.page_count} Pages)
                </span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline flex items-center gap-1.5 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open in Full Tab</span>
                </a>
              </div>
              <iframe
                src={`${pdfUrl}#toolbar=1`}
                title="Report PDF Preview"
                className="w-full flex-1 border-0"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-line bg-surface-subtle/80 flex items-center justify-between text-xs">
          <span className="text-ink-muted font-mono font-medium">
            Submitted: {new Date(order.created_at).toLocaleString("en-IN")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-subtle text-ink font-semibold border border-line rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
