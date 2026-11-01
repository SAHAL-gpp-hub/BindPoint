import React, { useState, useEffect } from "react";
import { BatchSummary, BatchDetail } from "../../types";
import { api, API_ORIGIN } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import {
  X,
  Layers,
  CheckCircle2,
  ArrowUpDown,
  Download,
  RefreshCw,
  Printer,
  FileArchive,
} from "lucide-react";

interface BatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchUpdated?: () => void;
}

export const BatchesModal: React.FC<BatchesModalProps> = ({
  isOpen,
  onClose,
  onBatchUpdated,
}) => {
  if (!isOpen) return null;

  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("enrollment");
  const [orderDir, setOrderDir] = useState<string>("asc");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const res = await api.listBatches();
      setBatches(res.batches);
      if (res.batches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(res.batches[0].id);
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBatchDetail = async (id: string, s = sortBy, d = orderDir) => {
    setIsDetailLoading(true);
    try {
      const detail = await api.getBatchDetail(id, s, d);
      setBatchDetail(detail);
    } catch (err) {
      console.error("Failed to load batch detail:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetail(selectedBatchId, sortBy, orderDir);
    }
  }, [selectedBatchId, sortBy, orderDir]);

  const handleToggleComplete = async (orderId: string) => {
    if (!selectedBatchId) return;
    try {
      const res = await api.toggleBatchOrderComplete(selectedBatchId, orderId);
      // Update local batchDetail
      setBatchDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          completed_reports: res.completed_reports,
          progress_percent: res.progress_percent,
          orders: prev.orders.map((o) =>
            o.order_id === orderId ? { ...o, print_status: res.print_status } : o
          ),
        };
      });
      // Update batches list
      setBatches((prev) =>
        prev.map((b) =>
          b.id === selectedBatchId
            ? {
                ...b,
                completed_reports: res.completed_reports,
                progress_percent: res.progress_percent,
              }
            : b
        )
      );
      if (onBatchUpdated) onBatchUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to toggle completion status.");
    }
  };

  const handleExportZip = async () => {
    if (!batchDetail || batchDetail.orders.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await api.exportBatchZip(batchDetail.orders.map((o) => o.order_id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${batchDetail.batch_name.replace(/\s+/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export batch ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-sm">
      <div className="glass-modal border border-line rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-subtle/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light text-surface flex items-center justify-center shadow-md shadow-accent/20">
              <Layers className="w-5 h-5 text-surface" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink">
                Print Batch Operations Console
              </h2>
              <p className="text-xs text-ink-secondary">
                Track printing batch progress, sort report sequence, and tick off physical reports as they complete.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface border border-line transition-all shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Split: Batches Sidebar + Selected Batch View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Batches List Sidebar */}
          <div className="w-full md:w-72 border-r border-line bg-surface-subtle/50 flex flex-col overflow-y-auto">
            <div className="p-3.5 border-b border-line flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-ink-muted text-[10px]">
                Batches ({batches.length})
              </span>
              <button
                type="button"
                onClick={loadBatches}
                disabled={isLoading}
                className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="divide-y divide-line/70 flex-1">
              {isLoading && batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted">Loading batches...</div>
              ) : batches.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted leading-relaxed">
                  No print batches created yet. Select orders on the main dashboard to create one.
                </div>
              ) : (
                batches.map((b) => {
                  const isSelected = b.id === selectedBatchId;
                  const isComplete = b.completed_reports === b.total_reports && b.total_reports > 0;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBatchId(b.id)}
                      className={`w-full text-left p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected ? "bg-accent-subtle/60 border-l-4 border-l-accent" : "hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-ink">{b.batch_name}</span>
                        {isComplete ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Done
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-ink-muted">
                            {b.completed_reports}/{b.total_reports}
                          </span>
                        )}
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isComplete ? "bg-emerald-600" : "bg-accent"
                          }`}
                          style={{ width: `${b.progress_percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-ink-muted font-medium">
                        <span>{b.total_pages} Pages • {b.total_sheets} Sheets</span>
                        <span className="font-mono">{b.progress_percent}%</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Batch Detail Panel */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-surface p-4 sm:p-6">
            {batchDetail ? (
              <div className="space-y-6">
                {/* Batch Header & Progress Bar Card */}
                <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-ink">
                          {batchDetail.batch_name}
                        </h3>
                        {batchDetail.completed_reports === batchDetail.total_reports && batchDetail.total_reports > 0 && (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>100% Complete</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-ink-muted font-mono mt-0.5 block">
                        Created {new Date(batchDetail.created_at).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportZip}
                      disabled={isExporting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-subtle text-ink border border-line rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                    >
                      <FileArchive className="w-3.5 h-3.5 text-accent" />
                      <span>{isExporting ? "Zipping..." : "Download Batch ZIP"}</span>
                    </button>
                  </div>

                  {/* Comprehensive Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-accent" />
                        <span>Batch Printing Progress</span>
                      </span>
                      <span className="font-mono font-bold text-ink">
                        {batchDetail.completed_reports} of {batchDetail.total_reports} Reports Finished ({batchDetail.progress_percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-surface-subtle border border-line rounded-full h-3.5 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                        style={{ width: `${batchDetail.progress_percent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-line text-xs">
                      <div>
                        <span className="text-ink-muted text-[10px] font-bold block uppercase tracking-wider">Total Reports</span>
                        <span className="font-mono font-bold text-ink text-sm sm:text-base">{batchDetail.total_reports}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted text-[10px] font-bold block uppercase tracking-wider">Total Document Pages</span>
                        <span className="font-mono font-bold text-ink text-sm sm:text-base">{batchDetail.total_pages}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted text-[10px] font-bold block uppercase tracking-wider">Total Physical Sheets</span>
                        <span className="font-mono font-bold text-ink text-sm sm:text-base">{batchDetail.total_sheets}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sorting Controls & Instructions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-ink-muted flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Sort Reports by:</span>
                    </span>
                    <select
                      value={`${sortBy}-${orderDir}`}
                      onChange={(e) => {
                        const [s, d] = e.target.value.split("-");
                        setSortBy(s);
                        setOrderDir(d);
                      }}
                      className="px-3 py-1.5 bg-surface border border-line rounded-xl text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-xs"
                    >
                      <option value="enrollment-asc">Enrollment Number (A-Z)</option>
                      <option value="enrollment-desc">Enrollment Number (Z-A)</option>
                      <option value="submission_time-asc">Submission Time (Oldest First)</option>
                      <option value="submission_time-desc">Submission Time (Newest First)</option>
                      <option value="name-asc">Student Name (A-Z)</option>
                    </select>
                  </div>

                  <span className="text-[11px] text-ink-muted font-medium">
                    Click the checkbox to tick off each report as physical printing finishes.
                  </span>
                </div>

                {/* Reports Table with Per-Report Completion Tick-off */}
                <div className="glass-card border border-line rounded-xl overflow-hidden shadow-card">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-subtle/80 border-b border-line text-ink-muted uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Done</th>
                        <th className="py-2.5 px-3">Enrollment & Student</th>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Pages / Sheets</th>
                        <th className="py-2.5 px-3">Print Status</th>
                        <th className="py-2.5 px-3 text-right">PDF File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {isDetailLoading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-ink-muted">
                            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-accent" />
                            <span>Updating reports list...</span>
                          </td>
                        </tr>
                      ) : (
                        batchDetail.orders.map((o) => {
                          const isComplete = o.print_status === "Completed";

                          return (
                            <tr
                              key={o.order_id}
                              className={`transition-colors ${
                                isComplete ? "bg-emerald-50/50" : "hover:bg-surface-subtle/60"
                              }`}
                            >
                              {/* Per-Report Completion Tick-Off Checkbox */}
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isComplete}
                                  onChange={() => handleToggleComplete(o.order_id)}
                                  className="w-4 h-4 rounded text-emerald-600 border-line focus:ring-emerald-500 cursor-pointer"
                                  title="Tick off report completion"
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-mono font-bold text-ink">
                                  {o.enrollment_number}
                                </div>
                                <div className="text-ink-secondary text-[11px]">{o.student_name}</div>
                              </td>

                              <td className="py-3 px-3 font-mono font-semibold text-ink">{o.order_id}</td>

                              <td className="py-3 px-3 font-mono">
                                <span className="font-bold text-ink">{o.page_count} Pages</span>
                                <span className="text-ink-muted block text-[11px]">
                                  {o.total_sheets} Sheets
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <StatusBadge status={o.print_status} type="print" />
                              </td>

                              <td className="py-3 px-3 text-right">
                                <a
                                  href={`${API_ORIGIN}/api/v1/admin/orders/${o.order_id}/pdf`}
                                  download
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline bg-surface-subtle px-2 py-1 rounded-md border border-line"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>PDF</span>
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-ink-muted font-medium">
                Select a batch from the sidebar to view details.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-line bg-surface-subtle/80 flex items-center justify-between text-xs">
          <span className="text-ink-muted font-medium">
            Printing Batch System • Automated Progress Tracking
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
