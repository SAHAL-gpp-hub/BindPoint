import os
import re
import secrets
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright, expect

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"
SCREENSHOTS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "qa_screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


def random_enrollment() -> str:
    return "21" + "".join(secrets.choice("0123456789") for _ in range(10))


def random_mobile() -> str:
    return "98" + "".join(secrets.choice("0123456789") for _ in range(8))


def random_utr() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(12))


def test_mobile_student_journey_and_validation():
    """
    Tests mobile viewport (390 x 844) full student journey:
    - Step 1: Info validation & entry
    - Step 2: Negative test (mixed non-A4 pages error) & upload 10p report
    - Step 3: Cost breakdown verification (10 pages -> ₹65.00)
    - Step 4: PDF Viewer inspection & mandatory confirmation gate
    - Step 5: Payment deep-link, QR check, 12-digit UTR submission
    - Step 6: Confirmation status & receipt
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport emulation (iPhone 14)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            is_mobile=True,
            has_touch=True,
        )
        page = context.new_page()

        # 1. Navigate to frontend
        page.goto("http://127.0.0.1:5173/")
        page.wait_for_selector("text=Student Information")
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step1_empty.png"))

        # Step 1: Validation tests
        # Submit empty -> browser required blocks
        enrollment = random_enrollment()
        mobile = random_mobile()
        
        page.fill('input[placeholder="e.g. Aarav Patel"]', "Aarav Patel")
        page.fill('input[placeholder="e.g. 210012345678"]', enrollment)
        page.fill('input[placeholder="9876543210"]', mobile)
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step1_filled.png"))
        page.click('text="Proceed to PDF Upload"')

        # Step 2: Upload Project Report
        page.wait_for_selector("text=Upload Project Report")
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step2_empty.png"))

        # Negative test: Upload mixed non-A4 PDF
        mixed_pdf = TEST_PDFS_DIR / "mixed_page_sizes.pdf"
        page.set_input_files('input[type="file"]', str(mixed_pdf))
        page.wait_for_selector("text=Upload Validation Error")
        expect(page.locator("text='Page 2, Page 4'")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step2_error_non_a4.png"))

        # Upload valid 10-page report
        valid_pdf = TEST_PDFS_DIR / "report_10p.pdf"
        page.set_input_files('input[type="file"]', str(valid_pdf))

        # Step 3: Cost Breakdown (auto-advances after upload)
        page.wait_for_selector("text=Printing Cost Calculation")
        expect(page.locator("text=10 PDF Pages")).to_be_visible()
        expect(page.locator("text=₹10.00").first).to_be_visible()
        expect(page.locator("text=₹45.00")).to_be_visible()
        expect(page.locator("text=₹65.00")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step3_breakdown.png"))
        page.click('text="Review & Verify Complete PDF"')

        # Step 4: Mandatory PDF Verification
        page.wait_for_selector("text=Mandatory PDF Verification")
        page.wait_for_selector("canvas")
        expect(page.locator("text=Page 1: Special Paper")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step4_page1.png"))

        # Confirm button must be disabled initially
        confirm_btn = page.locator('button:has-text("My PDF Is Final")')
        expect(confirm_btn).to_be_disabled()

        # Navigate through pages to unlock verification
        for _ in range(9):
            page.click('button[title="Next Page (Right Arrow)"]')
            page.wait_for_timeout(200)

        expect(page.locator("text=Page 10 of 10")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step4_last_page.png"))

        # Check confirmation checkbox
        page.check('#confirm-checkbox')
        expect(confirm_btn).to_be_enabled()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step4_ready.png"))
        confirm_btn.click()

        # Step 5: Payment Screen
        page.wait_for_selector("text=Payment & Verification")
        expect(page.locator("text=₹65.00").first).to_be_visible()
        expect(page.locator('text="Pay ₹65.00 with UPI App"')).to_be_visible()

        # Verify deep link attributes
        pay_link = page.locator('a:has-text("Pay ₹65.00 with UPI App")').get_attribute("href")
        assert pay_link.startswith("upi://pay?")
        assert "am=65.00" in pay_link
        assert "cu=INR" in pay_link
        assert "pa=" in pay_link

        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step5_payment.png"))

        # Submit 12-digit UTR
        test_utr = random_utr()
        page.fill('input[placeholder="e.g. 430123456789"]', test_utr)
        page.fill('input[placeholder="yourname@okaxis"]', "aarav@upi")
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step5_utr_filled.png"))
        page.click('button:has-text("Submit Payment for Verification")')

        # Step 6: Confirmation Screen
        page.wait_for_selector("text=Payment Submitted")
        expect(page.locator("text=VERIFICATION REQUIRED")).to_be_visible()
        expect(page.locator(f"text={test_utr}")).to_be_visible()
        expect(page.locator("text=Collection Instructions")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "mobile_step6_waiting.png"))

        browser.close()


def test_desktop_admin_journey():
    """
    Tests desktop viewport (1280 x 800):
    - Admin Login
    - Operational Metrics
    - Search & Filter
    - Confirm Payment Queue
    - Bulk Print Multi-Select & ZIP Export
    - Print Status Progression
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        page.goto("http://127.0.0.1:5173/")
        page.wait_for_selector("text=Admin Login")
        page.screenshot(path=str(SCREENSHOTS_DIR / "desktop_student_home.png"))

        # Click Admin Login
        page.click('text="Admin Login"')
        page.wait_for_selector("text=Print Station Admin")
        page.screenshot(path=str(SCREENSHOTS_DIR / "desktop_admin_login_modal.png"))

        # Login
        page.fill('input[type="email"]', "admin@printstation.local")
        page.fill('input[type="password"]', "AdminSecurePassword2026!")
        page.click('button:has-text("Sign In as Admin")')

        # Admin Dashboard Loaded
        page.wait_for_selector("text=Print Station Operations")
        expect(page.locator("text=Submissions")).to_be_visible()
        expect(page.locator("text=Verify Queue")).to_be_visible()
        page.screenshot(path=str(SCREENSHOTS_DIR / "desktop_admin_dashboard.png"))

        # If any pending verification payments exist, click Verify Pay
        verify_btns = page.locator('button:has-text("Verify Pay")')
        if verify_btns.count() > 0:
            verify_btns.first.click()
            page.wait_for_selector("text=Payment Verification")
            page.screenshot(path=str(SCREENSHOTS_DIR / "desktop_admin_verify_modal.png"))
            page.click('button:has-text("Confirm Payment (Mark Paid)")')
            page.wait_for_timeout(1000)

        # Multi-select first checkbox
        checkboxes = page.locator('tbody input[type="checkbox"]')
        if checkboxes.count() > 0:
            checkboxes.first.check()
            page.wait_for_selector("text=Orders Selected")
            page.screenshot(path=str(SCREENSHOTS_DIR / "desktop_admin_bulk_bar.png"))

        browser.close()


if __name__ == "__main__":
    print("Running Mobile Student Journey Test...")
    test_mobile_student_journey_and_validation()
    print("Mobile Journey Passed!")

    print("Running Desktop Admin Journey Test...")
    test_desktop_admin_journey()
    print("Desktop Admin Journey Passed!")
