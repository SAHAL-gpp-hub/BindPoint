import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ReportUploadResponse } from "../../types";
import { api } from "../../lib/api";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  LayoutGrid,
  Info,
  Check,
} from "lucide-react";

// Point PDF.js to the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Step4Props {
  report: ReportUploadResponse;
  onVerified: () => void;
  onNeedsChanges: () => void;
}

export const Step4PdfViewer: React.FC<Step4Props> = ({
  report,
  onVerified,
  onNeedsChanges,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(report.page_count);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);

  // Viewed pages tracking for mandatory review gate
  const [viewedPages, setViewedPages] = useState<Set<number>>(new Set([1]));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    const url = `/api/v1/reports/${report.report_id}/preview?token=${encodeURIComponent(
      report.preview_token
    )}`;

    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.763/cmaps/",
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(`Failed to load PDF document: ${err.message}`);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [report.report_id, report.preview_token]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    pdfDoc.getPage(currentPage).then((page) => {
      if (isCancelled || !canvasRef.current) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      page.render(renderContext).promise.then(() => {
        // Track page as viewed
        setViewedPages((prev) => new Set(prev).add(currentPage));
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.6));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const availableWidth = containerRef.current.clientWidth - 40;
      // Standard A4 width is 595.28 pt
      setScale(Math.max(0.6, Math.min(availableWidth / 595.28, 1.8)));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNextPage();
      else if (e.key === "ArrowLeft") handlePrevPage();
      else if (e.key === "+" || e.key === "=") handleZoomIn();
      else if (e.key === "-") handleZoomOut();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPage, totalPages]);

  // Check if student has inspected EVERY single page
  const viewedCount = viewedPages.size;
  const isSufficientlyViewed = totalPages > 0 && viewedCount === totalPages;
  const progressPercent = Math.round((viewedCount / Math.max(totalPages, 1)) * 100);

  const handleFinalConfirm = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      await api.verifyReport(report.report_id, report.pdf_hash, report.page_count);
      onVerified();
    } catch (err: any) {
      setError(err.message || "Failed to confirm verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  const isCurrentPageSpecial = currentPage === 1;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-8 sm:pt-4 sm:pb-12" ref={containerRef}>
      {/* Step Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Mandatory PDF Verification
            </h1>
            <span className="text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
              Required
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Carefully verify page orientation, margins, charts, and page numbers. Every single page must be viewed before payment unlocks.
          </p>
        </div>

        {/* Paper indicator badge & Verification Progress */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isCurrentPageSpecial ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Page 1: Special Paper (First Page)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Page {currentPage}: Normal Colour Duplex
            </span>
          )}
        </div>
      </div>

      {/* Viewer Main Frame */}
      <div className="glass-card rounded-2xl border border-line overflow-hidden flex flex-col shadow-card">
        {/* Top Control Bar */}
        <div className="bg-surface border-b border-line px-3.5 py-2.5 flex items-center justify-between text-xs">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none text-ink border border-line shadow-xs transition-all active:scale-[0.98]"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs text-ink px-2 font-bold tabular-nums">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none text-ink border border-line shadow-xs transition-all active:scale-[0.98]"
              title="Next Page (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom and Display Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1.5 shadow-xs ${
                showThumbnails
                  ? "bg-accent-subtle text-accent border-accent/40 font-semibold"
                  : "border-line hover:bg-surface-subtle text-ink-secondary"
              }`}
              title="Toggle Thumbnails"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thumbnails</span>
            </button>

            <div className="hidden sm:flex items-center border border-line rounded-lg overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-surface-subtle text-ink-secondary border-r border-line"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                className="px-2 py-1 text-[11px] font-mono hover:bg-surface-subtle text-ink-secondary border-r border-line"
                title="Fit Page Width"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-surface-subtle text-ink-secondary"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg border border-line hover:bg-surface-subtle text-ink-secondary shadow-xs transition-all"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Viewer Body: Thumbnails Sidebar + Canvas Center */}
        <div className="flex min-h-[460px] sm:min-h-[560px] bg-canvas-subtle relative overflow-hidden">
          {/* Thumbnails Drawer */}
          {showThumbnails && (
            <div className="w-32 sm:w-44 bg-surface border-r border-line p-2 overflow-y-auto max-h-[560px] space-y-2 shrink-0">
              <div className="text-[10px] uppercase font-mono font-bold text-ink-muted px-1 py-0.5">
                Pages ({viewedCount}/{totalPages} viewed)
              </div>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                const isViewed = viewedPages.has(pNum);
                const isCurrent = currentPage === pNum;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-full p-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                      isCurrent
                        ? "border-accent bg-accent-subtle/80 text-accent font-bold shadow-xs"
                        : "border-line bg-surface hover:bg-surface-subtle text-ink-secondary"
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold">Page {pNum}</span>
                    {isViewed ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Central PDF Canvas Display */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center">
            {loading ? (
              <div className="text-center p-8">
                <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-ink">Loading High-Resolution PDF...</p>
                <p className="text-[11px] text-ink-muted mt-1">Rendering duplex preview</p>
              </div>
            ) : error ? (
              <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-xl max-w-md text-rose-900 text-xs shadow-xs">
                <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
                <p className="font-semibold">{error}</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="shadow-2xl rounded-lg bg-surface border border-line max-w-full" />
            )}
          </div>
        </div>

        {/* Physical bind station note - COMPLETELY EMOJI-FREE */}
        <div className="bg-surface border-t border-line px-4 py-2.5 text-xs text-ink-secondary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <span className="truncate">
              Extra blank special-paper sheet will be inserted at physical bind station (not previewed).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-ink-muted">
              Verification:
            </span>
            <div className="w-20 bg-line-subtle h-2 rounded-full overflow-hidden border border-line">
              <div
                className="bg-accent h-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`font-mono text-xs font-bold ${isSufficientlyViewed ? "text-emerald-700" : "text-amber-700"}`}>
              {viewedCount}/{totalPages} ({progressPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Friction & Final Confirmation Form */}
      <div className="mt-6 glass-card rounded-2xl border border-line p-5 sm:p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm-checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={!isSufficientlyViewed}
              className="mt-1 w-4.5 h-4.5 text-accent border-line rounded focus:ring-accent disabled:opacity-40 cursor-pointer"
            />
            <label
              htmlFor="confirm-checkbox"
              className={`text-xs sm:text-sm leading-relaxed ${
                isSufficientlyViewed ? "text-ink cursor-pointer font-medium" : "text-ink-muted cursor-not-allowed"
              }`}
            >
              I have carefully inspected my complete PDF, including page 1, the last page, formatting, diagrams, and page numbers. I confirm this document is final for physical duplex printing.
            </label>
          </div>

          {!isSufficientlyViewed && (
            <div className="text-xs text-amber-900 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Please inspect every page of your document (reviewed {viewedCount} of {totalPages} pages) to unlock confirmation.
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          )}

          {/* Two Required Spec Options */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Option 1: I Need to Make Changes */}
            <button
              type="button"
              onClick={onNeedsChanges}
              className="min-h-[48px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded-xl text-xs sm:text-sm font-semibold text-ink-secondary transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>I Need to Make Changes</span>
            </button>

            {/* Option 2: My PDF Is Final */}
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={!confirmChecked || isVerifying || !isSufficientlyViewed}
              className="min-h-[48px] flex-1 sm:flex-initial sm:min-w-[280px] bg-gradient-to-r from-accent to-accent-light hover:from-accent-hover hover:to-accent text-surface text-xs sm:text-sm font-semibold py-3 px-5 rounded-xl shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Recording Verification...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>My PDF Is Final → Proceed to Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
