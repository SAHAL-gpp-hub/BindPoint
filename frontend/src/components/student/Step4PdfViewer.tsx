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

  // Check if student has inspected page 1, last page, and at least 80% of pages
  const hasSeenPage1 = viewedPages.has(1);
  const hasSeenLastPage = viewedPages.has(totalPages);
  const viewedCount = viewedPages.size;
  const isSufficientlyViewed = hasSeenPage1 && hasSeenLastPage && (totalPages <= 5 ? viewedCount === totalPages : viewedCount >= Math.ceil(totalPages * 0.7));

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
    <div className="max-w-4xl mx-auto px-4 py-6" ref={containerRef}>
      {/* Step Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <span>Mandatory PDF Verification</span>
            <span className="text-xs font-mono font-medium bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
              Required
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Carefully verify page orientation, margins, charts, and page numbers before confirming.
          </p>
        </div>

        {/* Paper indicator badge */}
        <div className="self-start sm:self-auto">
          {isCurrentPageSpecial ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              Page 1: Special Paper (First Page)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-blue-50 text-blue-800 border border-blue-200">
              Page {currentPage}: Normal Colour Duplex
            </span>
          )}
        </div>
      </div>

      {/* Viewer Main Frame */}
      <div className="bg-surface-subtle border border-line rounded-md overflow-hidden flex flex-col shadow-subtle">
        {/* Top Control Bar */}
        <div className="bg-surface border-b border-line px-3 py-2 flex items-center justify-between text-xs">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none text-ink border border-line transition-colors"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs text-ink px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none text-ink border border-line transition-colors"
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
              className={`p-1.5 rounded border border-line transition-colors text-xs flex items-center gap-1 ${
                showThumbnails ? "bg-accent-subtle text-accent border-accent" : "hover:bg-surface-subtle text-ink-secondary"
              }`}
              title="Toggle Thumbnails"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thumbnails</span>
            </button>

            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-surface-subtle text-ink border border-line transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-ink-muted w-10 text-center hidden sm:inline">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-surface-subtle text-ink border border-line transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleFitWidth}
              className="px-2 py-1 rounded hover:bg-surface-subtle text-ink border border-line text-[11px] font-medium hidden sm:inline"
            >
              Fit
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-surface-subtle text-ink border border-line transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Viewer Viewport with optional Thumbnail rail */}
        <div className="flex flex-1 min-h-[440px] sm:min-h-[580px] max-h-[70vh] overflow-hidden relative">
          {/* Thumbnails Sidebar */}
          {showThumbnails && (
            <div className="w-28 sm:w-36 bg-surface border-r border-line overflow-y-auto p-2 space-y-2 shrink-0">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`w-full text-center p-1.5 rounded border text-xs font-mono transition-colors block ${
                    currentPage === pg
                      ? "border-accent bg-accent-subtle font-semibold text-accent"
                      : "border-line hover:border-ink-muted text-ink-secondary bg-surface-subtle"
                  }`}
                >
                  <div className="text-[10px] text-ink-muted mb-0.5">
                    {pg === 1 ? "Special" : "Duplex"}
                  </div>
                  <div>Page {pg}</div>
                </button>
              ))}
            </div>
          )}

          {/* Canvas Rendering Area */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-line/20">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-medium text-ink">Loading PDF Viewer...</p>
              </div>
            ) : error ? (
              <div className="text-center p-6 bg-red-50 border border-red-200 rounded max-w-md text-red-900 text-xs">
                <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="font-semibold">{error}</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="shadow-md rounded bg-surface border border-line" />
            )}
          </div>
        </div>

        {/* Physical bind station note */}
        <div className="bg-surface border-t border-line px-3 py-2 text-[11px] text-ink-secondary flex items-center justify-between">
          <span className="truncate">
            ℹ️ Extra blank special-paper sheet will be inserted at physical bind station (not previewed).
          </span>
          <span className="font-mono text-ink-muted text-[10px] shrink-0 ml-2">
            Viewed: {viewedPages.size}/{totalPages} pages
          </span>
        </div>
      </div>

      {/* Mandatory Friction & Final Confirmation Form */}
      <div className="mt-6 bg-surface border border-line rounded-md p-4 sm:p-5 shadow-subtle">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="confirm-checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={!isSufficientlyViewed}
              className="mt-0.5 w-4 h-4 text-accent border-line rounded focus:ring-accent disabled:opacity-40"
            />
            <label
              htmlFor="confirm-checkbox"
              className={`text-xs sm:text-sm leading-relaxed ${
                isSufficientlyViewed ? "text-ink cursor-pointer" : "text-ink-muted cursor-not-allowed"
              }`}
            >
              I have carefully inspected my complete PDF, including page 1, the last page, formatting, diagrams, and page numbers. I confirm this document is final for physical duplex printing.
            </label>
          </div>

          {!isSufficientlyViewed && (
            <p className="text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Please review through your document (must inspect page 1 and page {totalPages}) to unlock confirmation.
              </span>
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}

          {/* Two Required Spec Options */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Option 1: I Need to Make Changes */}
            <button
              type="button"
              onClick={onNeedsChanges}
              className="min-h-[44px] px-4 py-2.5 border border-line hover:bg-surface-subtle rounded text-xs sm:text-sm font-medium text-ink-secondary transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>I Need to Make Changes</span>
            </button>

            {/* Option 2: My PDF Is Final */}
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={!confirmChecked || isVerifying || !isSufficientlyViewed}
              className="min-h-[44px] flex-1 sm:flex-initial sm:min-w-[240px] bg-accent hover:bg-accent-hover active:bg-accent text-surface text-xs sm:text-sm font-medium py-2.5 px-5 rounded shadow-subtle flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
