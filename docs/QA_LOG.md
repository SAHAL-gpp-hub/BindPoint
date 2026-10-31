# QA Test & Defect Log

This document tracks all manual and automated browser testing passes, detected defects, and resolutions throughout the implementation lifecycle.

---

## 1. Summary of QA Passes

| Pass # | Scope | Viewports Tested | Status | Defects Found | Resolved |
|---|---|---|---|---|---|
| **Pass 1** | Pure Pricing Engine Unit Suite | CLI (pytest) | **PASS** | 0 | 0 |
| **Pass 2** | PyMuPDF Ingestion & Geometry Suite | CLI (pytest) | **PASS** | 0 | 0 |
| **Pass 3** | Database Models, Verification Gate & Admin Auth | CLI (pytest / Postgres) | **PASS** | 2 | 2 |
| **Pass 4** | TypeScript Strict Compilation & Rollup Chunking | CLI (tsc / vite) | **PASS** | 18 warnings/errors | 18 |
| **Pass 5** | Playwright Mobile Viewport Journey ($390\times 844$) | Chromium Emulation | **PASS** | 2 selector issues | 2 |
| **Pass 6** | Playwright Desktop Viewport Journey ($1280\times 800$) | Chromium Headless | **PASS** | 0 | 0 |
| **Pass 7** | Multi-Document Pricing UI Audit ($N=2,3,10,11,20,21,50$) | Chromium Headless | **PASS** | 0 | 0 |
| **Pass 8** | Multi-Viewport Visual Hierarchy Audit ($360\text{px}, 768\text{px}, 1920\text{px}$) | Chromium Emulation | **PASS** | 0 | 0 |

---

## 2. Defect Log & Resolutions

### Defect 1: `greenlet` dependency missing for SQLAlchemy async engine
- **Discovery**: During `backend/app/init_db.py` execution.
- **Root Cause**: `sqlalchemy[asyncio]` with `asyncpg` requires `greenlet` for async concurrency shims.
- **Resolution**: Installed `greenlet>=3.1.1` and added to `backend/requirements.txt`.
- **Verification**: Database initialized cleanly, tables created, primary admin seeded.

### Defect 2: Asyncpg event loop reuse in pytest test sessions
- **Discovery**: In `backend/tests/test_orders.py` and `backend/tests/test_admin.py`.
- **Root Cause**: `AsyncEngine` pool retained connections created in previous event loops when tests ran in separate loops.
- **Resolution**: Added `backend/tests/conftest.py` with `autouse=True` fixture that calls `await engine.dispose()`. Configured `pytest.ini` with `asyncio_mode = auto` and `asyncio_default_fixture_loop_scope = function`.
- **Verification**: All 22 backend tests passed in 1.87s without connection leaks.

### Defect 3: TypeScript strict mode unused imports
- **Discovery**: During `npm --prefix frontend run build`.
- **Root Cause**: Unused icon imports (`Filter`, `Printer`, `CheckCircle`, etc.) in `AdminDashboard.tsx`, `PaymentVerificationModal.tsx`, `Step2Upload.tsx`, `Step4PdfViewer.tsx`, `Step5Payment.tsx`, and `Step6Confirmation.tsx`.
- **Resolution**: Removed all unused imports and wired sorting options to interactive select elements.
- **Verification**: `tsc && vite build` completed in 1.6s with zero errors.

### Defect 4: Playwright strict mode resolution on non-A4 error message
- **Discovery**: In `tests/e2e/test_browser_flow.py`.
- **Root Cause**: Both the error description paragraph and the offending pages span matched `"text=Page 2"`.
- **Resolution**: Updated selector to exact text `"text='Page 2, Page 4'"`.
- **Verification**: Test successfully validated non-A4 page rejection and list of offending pages.

### Defect 5: File input hidden by custom dropzone in automated tests
- **Discovery**: During `tests/e2e/test_responsive_and_all_pdfs.py`.
- **Root Cause**: The HTML file input has `class="hidden"` because it is styled via custom click triggers. `wait_for_selector` timed out waiting for visibility.
- **Resolution**: Used `state="attached"` in `wait_for_selector('input[type="file"]', state="attached")`.
- **Verification**: All 7 test PDFs uploaded and calculated in browser UI in under 10 seconds.

---

## 3. Visual & Responsive Artifacts Captured

All automated visual captures are stored in `storage/qa_screenshots/`:
- `mobile_step1_empty.png`: Mobile Step 1 initial form state ($390\text{px}$)
- `mobile_step1_filled.png`: Mobile Step 1 with validated student details
- `mobile_step2_empty.png`: Mobile PDF upload dropzone
- `mobile_step2_error_non_a4.png`: Mobile error alert showing offending non-A4 pages (`Page 2, Page 4`)
- `mobile_step3_breakdown.png`: Mobile itemized cost breakdown ledger
- `mobile_step4_page1.png`: Mobile PDF viewer showing Page 1 with `[Special Paper]` badge
- `mobile_step4_last_page.png`: Mobile PDF viewer showing Page 10 with `[Normal Colour Duplex]` badge
- `mobile_step4_ready.png`: Mobile PDF viewer with completed scroll requirement and unlocked confirmation
- `mobile_step5_payment.png`: Mobile UPI payment screen with deep link CTA and copy buttons
- `mobile_step5_utr_filled.png`: Mobile 12-digit UTR submission form
- `mobile_step6_waiting.png`: Mobile order status waiting for admin confirmation
- `desktop_student_home.png`: Desktop student landing layout ($1280\text{px}$)
- `desktop_admin_login_modal.png`: Desktop admin login modal with Argon2id auth
- `desktop_admin_dashboard.png`: Desktop operations console with metrics strip & orders table
- `desktop_admin_verify_modal.png`: Desktop UTR verification and amount confirmation modal
- `desktop_admin_bulk_bar.png`: Desktop floating sticky bulk action bar with live summary totals
- `viewport_360px_step1.png`: Responsive check at $360\text{px}$ (Samsung Galaxy)
- `viewport_768px_step1.png`: Responsive check at $768\text{px}$ (iPad)
- `viewport_1920px_step1.png`: Responsive check at $1920\text{px}$ (Full HD)
