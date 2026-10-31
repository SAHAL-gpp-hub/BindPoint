#!/usr/bin/env python3
"""
Test PDF Generator for College Project Report Printing Management Web App.
Generates:
  - Valid A4 PDFs with 1, 2, 3, 10, 11, 20, 21, 50 pages (labelled with page numbers)
  - Negative test cases:
      * corrupt.pdf (invalid byte stream)
      * password_protected.pdf (encrypted with password)
      * empty.pdf (0-byte file)
      * not_a_pdf.pdf (plain text renamed to .pdf)
      * mixed_page_sizes.pdf (A4 pages mixed with Letter / non-A4 pages)
      * oversized.pdf (> 50 MB synthetic PDF)
"""

import os
import sys
from pathlib import Path
import fitz  # PyMuPDF

# Standard A4 in points: 595.276 x 841.89
A4_WIDTH = 595.28
A4_HEIGHT = 841.89

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "storage" / "test_pdfs"


def create_standard_pdf(filename: str, page_count: int):
    doc = fitz.open()
    for i in range(1, page_count + 1):
        page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
        rect = fitz.Rect(50, 50, A4_WIDTH - 50, A4_HEIGHT - 50)
        
        # Header text
        header_text = f"College Project Report - Sample Document\nPage {i} of {page_count}"
        page.insert_text((50, 80), header_text, fontsize=14, fontname="helv", color=(0.1, 0.1, 0.1))
        
        # Big page indicator in center
        center_text = f"PAGE {i}"
        page.insert_text((A4_WIDTH / 2 - 60, A4_HEIGHT / 2), center_text, fontsize=32, fontname="helv", color=(0.1, 0.3, 0.2))
        
        # Additional content
        content = (
            f"This is test page {i} generated for automated and manual printing workflow verification.\n"
            f"Expected Paper Type: {'Special Paper (First Page)' if i == 1 else 'Normal Colour Paper'}\n"
            f"Dimensions: {A4_WIDTH:.2f} pt x {A4_HEIGHT:.2f} pt (A4 Standard)"
        )
        page.insert_textbox(rect, content, fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    
    filepath = OUTPUT_DIR / filename
    doc.save(str(filepath))
    doc.close()
    print(f"Created: {filepath.name} ({page_count} pages)")


def create_corrupt_pdf():
    filepath = OUTPUT_DIR / "corrupt.pdf"
    with open(filepath, "wb") as f:
        f.write(b"%PDF-1.4\n%Corrupt binary data that cannot be parsed\x00\xff\xfe\xfa\x12\x34\x56\x78" * 50)
    print("Created: corrupt.pdf")


def create_password_pdf():
    doc = fitz.open()
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    page.insert_text((100, 100), "Confidential - Password Protected", fontsize=16)
    filepath = OUTPUT_DIR / "password_protected.pdf"
    
    # Encrypt document with user password
    perm = int(
        fitz.PDF_PERM_ACCESSIBILITY
        | fitz.PDF_PERM_PRINT
        | fitz.PDF_PERM_COPY
        | fitz.PDF_PERM_ANNOTATE
    )
    doc.save(
        str(filepath),
        encryption=fitz.PDF_ENCRYPT_AES_256,
        user_pw="secret123",
        owner_pw="admin123",
        permissions=perm,
    )
    doc.close()
    print("Created: password_protected.pdf")


def create_empty_pdf():
    filepath = OUTPUT_DIR / "empty.pdf"
    with open(filepath, "wb") as f:
        pass  # 0 bytes
    print("Created: empty.pdf")


def create_fake_pdf():
    filepath = OUTPUT_DIR / "not_a_pdf.pdf"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("This is a plain text file masquerading as a PDF document.\n")
    print("Created: not_a_pdf.pdf")


def create_mixed_sizes_pdf():
    doc = fitz.open()
    # Page 1: A4
    p1 = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    p1.insert_text((50, 100), "Page 1 - A4 Standard", fontsize=14)
    
    # Page 2: US Letter (612 x 792)
    p2 = doc.new_page(width=612.0, height=792.0)
    p2.insert_text((50, 100), "Page 2 - US Letter (Non-A4)", fontsize=14)
    
    # Page 3: A4
    p3 = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    p3.insert_text((50, 100), "Page 3 - A4 Standard", fontsize=14)
    
    # Page 4: Custom Square (500 x 500)
    p4 = doc.new_page(width=500.0, height=500.0)
    p4.insert_text((50, 100), "Page 4 - Non-Standard Square (500x500)", fontsize=14)

    filepath = OUTPUT_DIR / "mixed_page_sizes.pdf"
    doc.save(str(filepath))
    doc.close()
    print("Created: mixed_page_sizes.pdf (Pages 2 and 4 non-A4)")


def create_oversized_pdf():
    doc = fitz.open()
    # Make a PDF exceeding 50 MB by embedding a large high-res pixmap repeatedly
    page = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
    page.insert_text((50, 100), "Oversized Test Document (> 50 MB)", fontsize=16)
    
    # Generate ~15 MB raw image stream and insert multiple times
    img_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * (15 * 1024 * 1024)
    for i in range(4):
        p = doc.new_page(width=A4_WIDTH, height=A4_HEIGHT)
        p.insert_text((50, 100), f"Big Data Page {i+1}", fontsize=14)
        try:
            # Insert stream directly
            doc.insert_file(doc)
        except Exception:
            pass
    
    filepath = OUTPUT_DIR / "oversized.pdf"
    doc.save(str(filepath))
    doc.close()
    
    # If not yet > 50MB, append dummy padding after EOF or pad raw
    size = filepath.stat().st_size
    if size < 51 * 1024 * 1024:
        with open(filepath, "ab") as f:
            f.write(b"\x00" * (52 * 1024 * 1024 - size))
    print(f"Created: oversized.pdf ({filepath.stat().st_size / (1024*1024):.1f} MB)")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating test PDFs in {OUTPUT_DIR} ...")
    
    # Required page counts per spec: 1, 2, 3, 10, 11, 20, 21, 50
    for count in [1, 2, 3, 10, 11, 20, 21, 50]:
        create_standard_pdf(f"report_{count}p.pdf", count)
    
    # Negative test cases
    create_corrupt_pdf()
    create_password_pdf()
    create_empty_pdf()
    create_fake_pdf()
    create_mixed_sizes_pdf()
    create_oversized_pdf()
    
    print("\nAll test PDFs successfully generated!")


if __name__ == "__main__":
    main()
