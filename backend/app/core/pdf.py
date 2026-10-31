"""
PyMuPDF PDF validation, inspection, geometry verification, and hashing engine.
"""

from dataclasses import dataclass
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pymupdf


# Standard A4 dimensions in typographic points (72 points = 1 inch)
# 210 mm x 297 mm:
# Width: 210 / 25.4 * 72 = 595.2756 pt
# Height: 297 / 25.4 * 72 = 841.8898 pt
A4_WIDTH_PT = 595.28
A4_HEIGHT_PT = 841.89

# 2 mm tolerance in points: 2 / 25.4 * 72 = 5.669 pt
A4_TOLERANCE_PT = 5.67


class PDFValidationError(Exception):
    """Raised when an uploaded PDF fails structural or printing suitability requirements."""
    def __init__(self, message: str, code: str = "INVALID_PDF", details: Optional[Dict] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


@dataclass(frozen=True)
class PDFInspectionResult:
    page_count: int
    file_size_bytes: int
    pdf_hash: str
    metadata: Dict[str, str]
    page_dimensions: List[Tuple[float, float]]


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hex digest for a file."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def validate_and_inspect_pdf(
    file_path: Path,
    max_size_mb: int = 50,
) -> PDFInspectionResult:
    """
    Validates that a file is a readable, unencrypted, properly formatted A4 PDF
    with at least 2 pages.
    
    Raises:
        PDFValidationError: On any validation failure with user-friendly messages.
    """
    if not file_path.exists():
        raise PDFValidationError("File does not exist on server.", code="FILE_NOT_FOUND")

    file_size = file_path.stat().st_size
    if file_size == 0:
        raise PDFValidationError("The uploaded file is empty (0 bytes). Please upload a valid PDF.", code="EMPTY_FILE")

    max_bytes = max_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise PDFValidationError(
            f"The uploaded file size ({file_size / (1024*1024):.1f} MB) exceeds the maximum limit of {max_size_mb} MB.",
            code="FILE_TOO_LARGE",
        )

    # Check magic bytes
    with open(file_path, "rb") as f:
        header = f.read(5)
        if not header.startswith(b"%PDF-"):
            raise PDFValidationError(
                "The uploaded file is not a valid PDF document.",
                code="INVALID_FORMAT",
            )

    # Open with PyMuPDF
    try:
        doc = pymupdf.open(str(file_path))
    except Exception as e:
        raise PDFValidationError(
            f"The PDF file is corrupted or could not be read: {str(e)}",
            code="CORRUPT_PDF",
        )

    try:
        # Check password protection / encryption
        if doc.is_encrypted:
            raise PDFValidationError(
                "The PDF is encrypted or password-protected. Please upload an unprotected PDF.",
                code="PASSWORD_PROTECTED",
            )

        page_count = doc.page_count
        if page_count < 2:
            raise PDFValidationError(
                f"Your report contains {page_count} page(s). A project report must contain at least 2 pages "
                "(the first special-paper title page plus report content).",
                code="INSUFFICIENT_PAGES",
                details={"page_count": page_count},
            )

        # Check page sizes
        non_a4_pages: List[int] = []
        page_dimensions: List[Tuple[float, float]] = []

        for idx, page in enumerate(doc, start=1):
            rect = page.rect
            width = float(rect.width)
            height = float(rect.height)
            page_dimensions.append((round(width, 2), round(height, 2)))

            # Check standard A4 portrait with tolerance
            # (If rotation is 90/270, rect accounts for orientation)
            is_a4_portrait = (
                abs(width - A4_WIDTH_PT) <= A4_TOLERANCE_PT
                and abs(height - A4_HEIGHT_PT) <= A4_TOLERANCE_PT
            )

            if not is_a4_portrait:
                non_a4_pages.append(idx)

        if non_a4_pages:
            offending_str = ", ".join(f"Page {p}" for p in non_a4_pages)
            raise PDFValidationError(
                f"All pages must be standard A4 size (210 x 297 mm). The following pages have non-standard dimensions: {offending_str}.",
                code="NON_A4_PAGES",
                details={"offending_pages": non_a4_pages},
            )

        # Extract metadata
        raw_meta = doc.metadata or {}
        clean_meta = {
            "title": raw_meta.get("title") or "",
            "author": raw_meta.get("author") or "",
            "creator": raw_meta.get("creator") or "",
            "producer": raw_meta.get("producer") or "",
            "creationDate": raw_meta.get("creationDate") or "",
        }

    finally:
        doc.close()

    pdf_hash = compute_sha256(file_path)

    return PDFInspectionResult(
        page_count=page_count,
        file_size_bytes=file_size,
        pdf_hash=pdf_hash,
        metadata=clean_meta,
        page_dimensions=page_dimensions,
    )
