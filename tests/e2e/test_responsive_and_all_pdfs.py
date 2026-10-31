import os
import secrets
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"
SCREENSHOTS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "qa_screenshots"


EXPECTED_PRICING = [
    (2, "₹25.00"),
    (3, "₹30.00"),
    (10, "₹65.00"),
    (11, "₹70.00"),
    (20, "₹115.00"),
    (21, "₹120.00"),
    (50, "₹265.00"),
]


def test_all_pdf_pricing_in_browser():
    """Verifies that every generated test PDF calculates the exact expected price in the browser UI."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for pages, expected_price in EXPECTED_PRICING:
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()

            pdf_path = TEST_PDFS_DIR / f"report_{pages}p.pdf"
            assert pdf_path.exists()

            page.goto("http://127.0.0.1:5173/")
            page.wait_for_selector('input[placeholder="e.g. Aarav Patel"]')

            page.fill('input[placeholder="e.g. Aarav Patel"]', "Test Student")
            page.fill('input[placeholder="e.g. 210012345678"]', "21" + "".join(secrets.choice("0123456789") for _ in range(10)))
            page.fill('input[placeholder="9876543210"]', "98" + "".join(secrets.choice("0123456789") for _ in range(8)))
            page.click('text="Proceed to PDF Upload"')

            page.wait_for_selector('input[type="file"]', state="attached")
            page.set_input_files('input[type="file"]', str(pdf_path))

            # Wait for cost breakdown
            page.wait_for_selector("text=Printing Cost Calculation")
            expect(page.locator(f"text={pages} PDF Pages")).to_be_visible()
            expect(page.locator(f"text={expected_price}")).to_be_visible()
            print(f"Verified in Browser: {pages} pages -> {expected_price}")

            page.close()
            context.close()

        browser.close()


def test_multi_viewport_visual_audit():
    """Captures screenshots across 360px, 768px, and 1920px viewports."""
    viewports = [
        ("360px", {"width": 360, "height": 740}),
        ("768px", {"width": 768, "height": 1024}),
        ("1920px", {"width": 1920, "height": 1080}),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for name, vp in viewports:
            context = browser.new_context(viewport=vp)
            page = context.new_page()
            page.add_init_script("() => { localStorage.clear(); sessionStorage.clear(); }")
            page.goto("http://127.0.0.1:5173/")
            page.locator("h1:has-text('Student Information')").wait_for(timeout=10000)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{name}_step1.png"))
            print(f"Captured: viewport_{name}_step1.png")
            page.close()
            context.close()
        browser.close()


if __name__ == "__main__":
    print("Testing All PDF Pricing in Browser UI...")
    test_all_pdf_pricing_in_browser()
    print("All PDF Pricing Verified in Browser!\n")

    print("Running Multi-Viewport Visual Audit...")
    test_multi_viewport_visual_audit()
    print("Multi-Viewport Audit Finished!")
