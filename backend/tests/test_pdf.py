from pathlib import Path
import pytest
from backend.app.core.pdf import validate_and_inspect_pdf, PDFValidationError

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"


def test_valid_a4_pdfs():
    for pages in [2, 3, 10, 11, 20, 21, 50]:
        pdf_path = TEST_PDFS_DIR / f"report_{pages}p.pdf"
        assert pdf_path.exists(), f"File {pdf_path} not found"
        
        result = validate_and_inspect_pdf(pdf_path)
        assert result.page_count == pages
        assert len(result.pdf_hash) == 64
        assert result.file_size_bytes > 0
        assert len(result.page_dimensions) == pages


def test_single_page_pdf_rejected():
    pdf_path = TEST_PDFS_DIR / "report_1p.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code == "INSUFFICIENT_PAGES"
    assert "at least 2 pages" in exc.value.message


def test_corrupt_pdf_rejected():
    pdf_path = TEST_PDFS_DIR / "corrupt.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code in ["CORRUPT_PDF", "INVALID_FORMAT"]


def test_empty_pdf_rejected():
    pdf_path = TEST_PDFS_DIR / "empty.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code == "EMPTY_FILE"


def test_not_a_pdf_rejected():
    pdf_path = TEST_PDFS_DIR / "not_a_pdf.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code == "INVALID_FORMAT"


def test_password_protected_rejected():
    pdf_path = TEST_PDFS_DIR / "password_protected.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code == "PASSWORD_PROTECTED"


def test_mixed_page_sizes_rejected_with_specific_pages():
    pdf_path = TEST_PDFS_DIR / "mixed_page_sizes.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path)
    assert exc.value.code == "NON_A4_PAGES"
    assert "Page 2" in exc.value.message
    assert "Page 4" in exc.value.message
    assert exc.value.details["offending_pages"] == [2, 4]


def test_oversized_pdf_rejected():
    pdf_path = TEST_PDFS_DIR / "oversized.pdf"
    with pytest.raises(PDFValidationError) as exc:
        validate_and_inspect_pdf(pdf_path, max_size_mb=50)
    assert exc.value.code == "FILE_TOO_LARGE"
