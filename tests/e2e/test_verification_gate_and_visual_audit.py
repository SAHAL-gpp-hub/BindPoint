import os
import secrets
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from backend.app.core.limiter import limiter

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"
SCREENSHOTS_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

FRONTEND_URL = "http://127.0.0.1:5173"


def random_enrollment() -> str:
    return "21" + "".join(secrets.choice("0123456789") for _ in range(10))


def random_mobile() -> str:
    return "98" + "".join(secrets.choice("0123456789") for _ in range(8))


def random_utr() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(12))


def test_verification_gate_every_page_required():
    """
    ITEM 5 VERIFICATION GATE TEST:
    Verifies that the confirm button and checkbox unlock ONLY after EVERY single page has been viewed.
    - Inspecting Page 1 alone -> Locked.
    - Inspecting Page 1 and Page 10 (first and last) -> Locked.
    - Only after inspecting ALL 10 pages (1..10) -> Unlocks.
    """
    print("\n--- Running Test: Verification Gate Every-Page Requirement ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.goto(FRONTEND_URL)
        page.locator('h1:has-text("Student Information")').wait_for(state="visible")

        # Step 1
        page.fill('input[placeholder="e.g. Aarav Patel"]', "Dev Test Student")
        page.fill('input[placeholder="e.g. 210012345678"]', random_enrollment())
        page.fill('input[placeholder="9876543210"]', random_mobile())
        page.click('button:has-text("Proceed to PDF Upload")')

        # Step 2: Upload 10-page document
        page.locator('h1:has-text("Upload Project Report")').wait_for(state="visible")
        pdf_10p = TEST_PDFS_DIR / "report_10p.pdf"
        page.set_input_files('input[type="file"]', str(pdf_10p))

        # Step 3: Calculation screen
        page.locator('h1:has-text("Printing Cost Calculation")').wait_for(state="visible")
        expect(page.locator("text=10 PDF Pages")).to_be_visible()
        page.click('button:has-text("Review & Verify Complete PDF")')

        # Step 4: PDF Verification Gate
        page.locator('h1:has-text("Mandatory PDF Verification")').wait_for(state="visible")
        page.locator("canvas").wait_for(state="visible")
        page.wait_for_timeout(500)

        checkbox = page.locator("#confirm-checkbox")
        confirm_btn = page.locator('button:has-text("My PDF Is Final")')

        # Condition A: Only Page 1 viewed
        expect(checkbox).to_be_disabled()
        expect(confirm_btn).to_be_disabled()
        warning_locator = page.locator("text=Please inspect every page of your document")
        expect(warning_locator).to_be_visible()
        expect(page.locator("text=reviewed 1 of 10 pages")).to_be_visible()
        print("✓ Verified: Page 1 alone keeps confirmation gate LOCKED (reviewed 1 of 10).")

        # Condition B: Jump directly to last page (Page 10) using thumbnails
        page.click('button[title="Toggle Thumbnails"]')
        page.locator('button:has-text("Page 10")').wait_for(state="visible")
        page.click('button:has-text("Page 10")')
        page.wait_for_timeout(500)

        expect(page.locator("text=Page 10 of 10")).to_be_visible()
        # Even though first and last pages are viewed, viewed count is only 2 of 10!
        expect(checkbox).to_be_disabled()
        expect(confirm_btn).to_be_disabled()
        expect(page.locator("text=reviewed 2 of 10 pages")).to_be_visible()
        print("✓ Verified: Viewing first (page 1) and last (page 10) STILL keeps gate LOCKED (reviewed 2 of 10).")

        # Condition C: Sequentially navigate through remaining pages 2 through 9
        for pg_num in range(2, 10):
            page.click(f'button:has-text("Page {pg_num}")')
            page.wait_for_timeout(200)

        # Now all 10 of 10 pages are viewed!
        page.wait_for_timeout(500)
        expect(checkbox).to_be_enabled()
        expect(warning_locator).not_to_be_visible()
        print("✓ Verified: After inspecting all 10 of 10 pages, checkbox UNLOCKS!")

        # Checkbox checked -> Final confirm button unlocks
        checkbox.check()
        expect(confirm_btn).to_be_enabled()
        print("✓ Verified: Confirm button unlocks and allows proceeding to order creation.")

        browser.close()


def test_visual_audit_all_viewports():
    """
    ITEM 6 VISUAL AUDIT:
    Captures pixel-perfect full visual audit across 5 mandatory viewports:
    - 360px (Small Mobile / Galaxy)
    - 390px (Modern Mobile / iPhone)
    - 768px (Tablet / iPad Portrait)
    - 1280px (Standard Laptop / Desktop)
    - 1920px (Full HD Monitor)
    Saves all captures under docs/screenshots/.
    """
    print("\n--- Running Test: Visual Audit Across 360, 390, 768, 1280, 1920 Viewports ---")
    viewports = [
        ("360", 360, 740),
        ("390", 390, 844),
        ("768", 768, 1024),
        ("1280", 1280, 800),
        ("1920", 1920, 1080),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for label, width, height in viewports:
            print(f"\n>> Capturing Viewport: {label}px ({width}x{height})")
            context = browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
            )
            page = context.new_page()

            # 1. Step 1: Student Information
            page.goto(FRONTEND_URL)
            page.locator('h1:has-text("Student Information")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step1.png"))

            # Fill Student Form
            enrollment = random_enrollment()
            page.fill('input[placeholder="e.g. Aarav Patel"]', f"Audit Student {label}")
            page.fill('input[placeholder="e.g. 210012345678"]', enrollment)
            page.fill('input[placeholder="9876543210"]', "9876543210")
            page.click('button:has-text("Proceed to PDF Upload")')

            # 2. Step 2: Upload Project Report
            page.locator('h1:has-text("Upload Project Report")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step2.png"))

            # Upload 3-page report
            pdf_3p = TEST_PDFS_DIR / "report_3p.pdf"
            page.set_input_files('input[type="file"]', str(pdf_3p))

            # 3. Step 3: Cost Breakdown
            page.locator('h1:has-text("Printing Cost Calculation")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step3.png"))
            page.click('button:has-text("Review & Verify Complete PDF")')

            # 4. Step 4: PDF Viewer
            page.locator('h1:has-text("Mandatory PDF Verification")').wait_for(state="visible")
            page.locator("canvas").wait_for(state="visible")
            page.wait_for_timeout(400)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step4.png"))

            # Inspect all 3 pages
            for _ in range(2):
                page.click('button[title="Next Page (Right Arrow)"]')
                page.wait_for_timeout(250)

            # Check and confirm
            page.check('#confirm-checkbox')
            page.click('button:has-text("My PDF Is Final")')

            # 5. Step 5: Payment & UPI Screen
            page.locator('h1:has-text("Payment & Verification")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step5.png"))

            # Submit UTR
            utr = random_utr()
            page.fill('input[placeholder="e.g. 430123456789"]', utr)
            page.fill('input[placeholder="yourname@okaxis"]', f"student{label}@upi")
            page.click('button:has-text("Submit Payment for Verification")')

            # 6. Step 6: Confirmation & Digital Receipt
            page.locator('h1:has-text("Payment Submitted")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_student_step6.png"))

            # 7. Admin Screens in this viewport
            # Reset rate limiter for automated testing across multiple viewports
            limiter.reset()
            # Open Admin Login
            page.click('button:has-text("Admin Login")')
            page.locator('h2:has-text("Print Station Admin")').wait_for(state="visible")
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_admin_login.png"))

            # Login
            page.fill('input[placeholder="admin@printstation.local"]', "admin@printstation.local")
            page.fill('input[placeholder="••••••••••••"]', "AdminSecurePassword2026!")
            page.click('button:has-text("Sign In as Admin")')

            # 8. Admin Dashboard
            page.locator('h1:has-text("Print Station Operations")').wait_for(state="visible")
            page.wait_for_timeout(500)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_admin_dashboard.png"))

            # 9. Admin Order Detail Modal
            page.locator('button:has-text("Detail")').first.click()
            page.locator('h3:has-text("Full Student Information")').wait_for(state="visible")
            page.wait_for_timeout(500)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_admin_order_detail.png"))
            page.locator('button:has-text("Close")').click()

            # 10. Admin Batches Modal
            page.click('button:has-text("Batches Console")')
            page.locator('h2:has-text("Print Batch Operations Console")').wait_for(state="visible")
            page.wait_for_timeout(500)
            page.screenshot(path=str(SCREENSHOTS_DIR / f"viewport_{label}px_admin_batches.png"))
            page.locator('button:has-text("Close")').click()

            context.close()
            print(f"✓ Completed all 10 captures for viewport {label}px.")

        browser.close()


if __name__ == "__main__":
    test_verification_gate_every_page_required()
    test_visual_audit_all_viewports()
    print("\nAll verification gate tests and visual audit passes completed successfully!")
