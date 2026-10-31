import React, { useState, useRef } from "react";
import { ReportUploadResponse } from "../../types";
import { api } from "../../lib/api";
import { UploadCloud, AlertCircle, CheckCircle2, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";

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
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          Upload Project Report
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Upload your final compiled project report in PDF format (Standard A4, max 50 MB).
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-md p-6 sm:p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-accent bg-accent-subtle/50"
            : currentReport
            ? "border-line bg-surface"
            : "border-line hover:border-ink-muted bg-surface/50 hover:bg-surface"
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
            <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-ink">Uploading & Analyzing PDF...</p>
            <p className="text-xs text-ink-muted mt-1">Inspecting page dimensions and duplex geometry</p>
            <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden mt-4 max-w-xs mx-auto border border-line">
              <div
                className="bg-accent h-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-ink-muted mt-1 block">
              {uploadProgress}%
            </span>
          </div>
        ) : currentReport ? (
          <div className="py-2">
            <div className="w-12 h-12 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-ink truncate max-w-md mx-auto">
              {currentReport.original_filename}
            </p>
            <div className="flex items-center justify-center gap-3 text-xs font-mono text-ink-muted mt-1.5">
              <span>{currentReport.page_count} Pages</span>
              <span>•</span>
              <span>{(currentReport.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
              <span>•</span>
              <span className="text-emerald-700 font-sans font-medium">A4 Verified</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink bg-surface-subtle hover:bg-surface border border-line rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace PDF</span>
            </button>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-12 h-12 rounded bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-3 border border-line">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-ink">
              Drag and drop your report PDF here, or <span className="text-accent underline font-semibold">browse files</span>
            </p>
            <p className="text-xs text-ink-muted mt-1.5">
              A4 size only • Minimum 2 pages • Max 50 MB
            </p>
          </div>
        )}
      </div>

      {/* Error Alert with offending pages if applicable */}
      {errorMsg && (
        <div className="mt-4 p-4 rounded bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-red-800">Upload Validation Error</p>
              <p className="text-red-700">{errorMsg}</p>
              {offendingPages && offendingPages.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <span className="font-medium text-red-800">Offending non-A4 pages: </span>
                  <span className="font-mono text-red-700">
                    {offendingPages.map((p) => `Page ${p}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded text-xs sm:text-sm font-medium text-ink-secondary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {currentReport && (
          <button
            type="button"
            onClick={() => onUploadSuccess(currentReport)}
            className="min-h-[48px] flex-1 bg-accent hover:bg-accent-hover active:bg-accent text-surface text-xs sm:text-sm font-medium py-2.5 px-4 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Review Cost Breakdown</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
