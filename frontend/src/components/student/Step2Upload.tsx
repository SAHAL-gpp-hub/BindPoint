import React, { useState, useRef } from "react";
import { ReportUploadResponse } from "../../types";
import { api } from "../../lib/api";
import { UploadCloud, AlertCircle, CheckCircle2, RefreshCw, ArrowRight, ArrowLeft, FileText, Layers, ShieldCheck } from "lucide-react";

interface Step2Props {
  currentReport?: ReportUploadResponse | null;
  onUploadSuccess: (report: ReportUploadResponse) => void;
  onBack: () => void;
}

export const Step2Upload: React.FC<Step2Props> = ({
  currentReport,
  onUploadSuccess,
  onBack,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offendingPages, setOffendingPages] = useState<number[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please select a PDF document (.pdf). Other file formats are not accepted.");
      setOffendingPages(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit.`);
      setOffendingPages(null);
      return;
    }

    setErrorMsg(null);
    setOffendingPages(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await api.uploadReport(file, (percent) => {
        setUploadProgress(percent);
      });
      onUploadSuccess(response);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze PDF file.");
      if (err.details && Array.isArray(err.details.offending_pages)) {
        setOffendingPages(err.details.offending_pages);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-8 sm:pt-6 sm:pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-subtle text-accent border border-accent/20 mb-3">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span>Automated Duplex Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Upload Project Report
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 leading-relaxed">
          Upload your final compiled project report in PDF format (Standard A4, max 50 MB). We inspect page dimensions and compute duplex printing requirements.
        </p>
      </div>

      {/* Main Upload Dropzone Container */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-accent bg-accent-subtle/60 scale-[1.01]"
              : currentReport
              ? "border-emerald-300 bg-emerald-50/30"
              : "border-line-dark/80 hover:border-accent/60 bg-surface-subtle/40 hover:bg-surface-subtle/80"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto mb-4 border border-accent/20 shadow-sm">
                <RefreshCw className="w-7 h-7 text-accent animate-spin" />
              </div>
              <p className="text-base font-semibold text-ink">Uploading & Analyzing PDF...</p>
              <p className="text-xs text-ink-secondary mt-1">Inspecting page dimensions and duplex geometry</p>
              
              <div className="w-full bg-line-subtle h-2.5 rounded-full overflow-hidden mt-5 max-w-xs mx-auto border border-line">
                <div
                  className="bg-accent h-full transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-accent mt-2 block">
                {uploadProgress}%
              </span>
            </div>
          ) : currentReport ? (
            <div className="py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 border border-emerald-300 shadow-sm">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <p className="text-base font-semibold text-ink truncate max-w-md mx-auto">
                {currentReport.original_filename}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-surface border border-line text-ink">
                  {currentReport.page_count} Pages
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-surface border border-line text-ink">
                  {(currentReport.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  A4 Verified
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink bg-surface hover:bg-surface-subtle border border-line rounded-lg shadow-xs transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace PDF</span>
              </button>
            </div>
          ) : (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-surface text-accent flex items-center justify-center mx-auto mb-4 border border-line shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm sm:text-base font-semibold text-ink">
                Drag and drop your report PDF here, or <span className="text-accent underline">browse files</span>
              </p>
              <p className="text-xs text-ink-muted mt-2">
                A4 size only • Minimum 2 pages • Max 50 MB
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-ink-secondary">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-accent" /> PDF Format</span>
                <span>•</span>
                <span>Duplex Auto-Layout</span>
                <span>•</span>
                <span>Server-side Verification</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert with offending pages if applicable */}
        {errorMsg && (
          <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-800">Upload Validation Error</p>
                <p className="text-rose-700 leading-relaxed">{errorMsg}</p>
                {offendingPages && offendingPages.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200">
                    <span className="font-semibold text-rose-800">Offending non-A4 pages: </span>
                    <span className="font-mono text-rose-700 font-medium">
                      {offendingPages.map((p) => `Page ${p}`).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[48px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded-xl text-xs sm:text-sm font-semibold text-ink-secondary transition-all flex items-center gap-2 shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {currentReport && (
            <button
              type="button"
              onClick={() => onUploadSuccess(currentReport)}
              className="min-h-[48px] flex-1 bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-xs sm:text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Review Cost Breakdown</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
