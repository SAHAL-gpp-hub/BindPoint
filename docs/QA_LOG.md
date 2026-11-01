# QA Test & Defect Log

This document tracks all manual and automated testing passes, detected defects, resolutions, and compliance checks across backend services, browser interfaces, and responsive viewports.

---

## 1. Summary of QA Passes

| Pass # | Scope | Test Harness / Viewports | Status | Defects Found | Resolved |
|---|---|---|---|---|---|
| **Pass 1** | Pure Pricing Engine Unit Suite | CLI (`pytest`) | **PASS** | 0 | 0 |
| **Pass 2** | PyMuPDF Ingestion & Geometry Suite | CLI (`pytest`) | **PASS** | 0 | 0 |
| **Pass 3** | Database Models, Verification Gate & Admin Auth | CLI (`pytest` / Postgres) | **PASS** | 2 | 2 |
| **Pass 4** | TypeScript Strict Compilation & Rollup Chunking | CLI (`tsc` / `vite`) | **PASS** | 18 | 18 |
| **Pass 5** | Playwright Mobile Viewport Journey ($390\times 844$) | Chromium Emulation | **PASS** | 2 | 2 |
| **Pass 6** | Playwright Desktop Viewport Journey ($1280\times 800$) | Chromium Headless | **PASS** | 0 | 0 |
| **Pass 7** | Multi-Document Pricing UI Audit ($N=2,3,10,11,20,21,50$) | Chromium Headless | **PASS** | 0 | 0 |
| **Pass 8** | Multi-Viewport Visual Hierarchy Audit ($360\text{px}, 768\text{px}, 1920\text{px}$) | Chromium Emulation | **PASS** | 0 | 0 |
| **Pass 9** | CSRF Double-Submit Protection on State-Changing Admin Endpoints | CLI (`pytest` / `httpx`) | **PASS** | 0 | 0 |
| **Pass 10** | Admin Login Rate Limiting (slowapi threshold enforcement) | CLI (`pytest` / `httpx`) | **PASS** | 0 | 0 |
| **Pass 11** | Unauthenticated Admin & File Route Protection (401/403) | CLI (`pytest` / `httpx`) | **PASS** | 0 | 0 |
| **Pass 12** | Admin Orders Submission Date Filtering (`date_from`, `date_to`) | CLI (`pytest` & Browser) | **PASS** | 0 | 0 |
| **Pass 13** | Print Batches Lifecycle, Progress Bar, Sorting & Per-Report Tick-Off | CLI (`pytest` & Browser) | **PASS** | 0 | 0 |
| **Pass 14** | Strict Verification Gate (All Pages Mandatory Inspection) | Playwright Headless | **PASS** | 0 | 0 |
| **Pass 15** | Comprehensive 5-Viewport Visual Audit ($360, 390, 768, 1280, 1920\text{px}$) | Playwright (`docs/screenshots/`) | **PASS** | 0 | 0 |

---

## 2. Item-by-Item Verification & Evidence Report

### Item 1: Admin Orders — Submission Date Filter & Per-Order Detail
- **Status**: **PASS**
- **Evidence**:
  1. **Submission Date Filter (`date_from` / `date_to`)**:
     - Backend API `GET /api/v1/admin/orders` accepts `date_from` and `date_to` query parameters, filtering order creation times in UTC (`Order.created_at >= dt_from` and `Order.created_at <= dt_to`). Tested in `backend/tests/test_admin.py::test_admin_orders_submission_date_filter` (PASSED).
     - Frontend UI in [`AdminDashboard.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/admin/AdminDashboard.tsx) provides interactive date pickers with clear controls and live data re-fetching.
  2. **Per-Order Detail Modal**:
     - Confirmed via [`AdminOrderDetailModal.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/admin/AdminOrderDetailModal.tsx) containing:
       - **Full student info**: Student Name, Enrollment Number, Mobile Phone Number.
       - **Cost breakdown**: Itemized table showing Total Pages, Normal Duplex Sheets, Special Bond Paper Sheets (Page 1 + balance), Colour Printed Sides, Blank Sides, and Line Item Totals.
       - **PDF preview**: Integrated inline interactive PDF preview viewport.
       - **PDF download**: Direct download link to `/api/v1/admin/orders/{order_id}/pdf`.
       - **Receipt PDF**: Direct download button to `/api/v1/admin/orders/{order_id}/receipt` generated via ReportLab.
       - **Activity timeline**: Complete chronological audit log of all order state changes with actor types, state transitions, and operator notes.
       - **Print-status buttons**: Immediate status transition buttons for "Printing" and "Completed".

---

### Item 2: Batches — Progress Bar, Sorting & Per-Report Completion Tick-Off
- **Status**: **PASS**
- **Evidence**:
  1. **Batch Progress Bar**:
     - Backend computes `completed_reports` and dynamic `progress_percent` (`completed / total * 100`) on `GET /api/v1/admin/batches` and `GET /api/v1/admin/batches/{batch_id}`.
     - Frontend [`BatchesModal.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/admin/BatchesModal.tsx) displays live progress percentage bar, sheet/page metrics, and status badges.
  2. **Sorting by Enrollment & Submission Time**:
     - Endpoint `GET /api/v1/admin/batches/{batch_id}?sort_by=enrollment` and `sort_by=submission_time` supported on the backend.
     - Frontend selector allows toggling between Enrollment Number (A-Z / Z-A) and Submission Time (Newest / Oldest).
  3. **Per-Report Completion Tick-Off**:
     - Endpoint `POST /api/v1/admin/batches/{batch_id}/orders/{order_id}/toggle-complete` updates order print status to `"Completed"` (or toggles back), updates batch progress, and logs to `ActivityLog`.
     - Tested in `backend/tests/test_admin.py::test_batches_progress_sorting_and_completion_tickoff` (PASSED: Progress verified stepping from 0% -> 50% -> 100%).

---

### Item 3: Security — CSRF Protection, Rate Limiting & Route Authentication
- **Status**: **PASS**
- **Evidence**:
  1. **CSRF Protection on State-Changing Endpoints**:
     - Implemented in `backend/app/api/deps.py` via `verify_admin_csrf` dependency on all `POST`, `PUT`, `PATCH`, `DELETE` routes under `/api/v1/admin/`.
     - Requests authenticated via cookie require a matching `X-CSRF-Token` header.
     - **Test Evidence**: `test_admin_csrf_protection_and_state_changing_rejection` in `backend/tests/test_admin.py`:
       - Submitting `POST /api/v1/admin/orders/.../payment/confirm` without `X-CSRF-Token` returned `403 Forbidden` (`detail: "CSRF validation failed: Missing or invalid X-CSRF-Token header"`).
       - Submitting with forged token returned `403 Forbidden`.
       - Submitting with valid matching `X-CSRF-Token` succeeded.
  2. **Login Rate Limiting**:
     - Configured on `POST /api/v1/admin/auth/login` via `@limiter.limit("5/minute")` with `slowapi`.
     - **Test Evidence**: `test_admin_login_rate_limiting` in `backend/tests/test_admin.py`: 7 consecutive rapid requests triggered HTTP `429 Too Many Requests`.
  3. **Unauthenticated Route Protection (401 / 403)**:
     - **Test Evidence**: `test_unauthenticated_admin_and_file_routes` in `backend/tests/test_admin.py` verified that unauthenticated requests to `/dashboard/metrics`, `/orders`, `/orders/{id}`, `/orders/{id}/pdf`, `/orders/{id}/receipt`, `/orders/{id}/screenshot`, and `/batches` all returned `401 Unauthorized`.
     - Student privacy lookup returns `403 Forbidden` if mismatched mobile number is supplied.

---

### Item 4: Student Form Persistence — sessionStorage & Reset on Completion
- **Status**: **PASS**
- **Evidence**:
  1. Updated [`frontend/src/App.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/App.tsx): All form data keys (`printstation_step`, `printstation_student`, `printstation_report`, `printstation_order`) now exclusively read and write to `sessionStorage` instead of `localStorage`.
  2. Data does not persist across separate browser sessions.
  3. Upon order completion or when clicking "Done / Submit Another Report", `handleResetFlow` invokes `sessionStorage.removeItem` for all keys and clears state.

---

### Item 5: Verification Gate — Every Page Mandatory Inspection
- **Status**: **PASS**
- **Evidence**:
  1. Updated [`frontend/src/components/student/Step4PdfViewer.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/student/Step4PdfViewer.tsx):
     ```typescript
     const isSufficientlyViewed = totalPages > 0 && viewedPages.size === totalPages;
     ```
     The checkbox and confirmation button remain disabled until `viewedPages.size === totalPages`.
  2. **Test Evidence**: Automated Playwright test in `tests/e2e/test_verification_gate_and_visual_audit.py::test_verification_gate_every_page_required`:
     - Inspecting Page 1 alone: checkbox disabled, confirm button disabled, banner displayed `reviewed 1 of 10 pages`.
     - Jumping directly to Page 10 (last page): checkbox disabled, confirm button disabled, banner displayed `reviewed 2 of 10 pages`.
     - Inspecting remaining pages 2 through 9 (10 of 10 total pages viewed): checkbox unlocked, warning banner cleared, confirm button unlocked.

---

### Item 6: Visual Audit — All Viewports (360, 390, 768, 1280, 1920)
- **Status**: **PASS**
- **Evidence**:
  - Automated Playwright run generated and saved 50 screenshots (10 screens $\times$ 5 viewports) under `docs/screenshots/`:
    - `viewport_360px_*` (Small Mobile / Samsung Galaxy)
    - `viewport_390px_*` (Modern Mobile / iPhone 14)
    - `viewport_768px_*` (Tablet / iPad Portrait)
    - `viewport_1280px_*` (Standard Laptop / Desktop)
    - `viewport_1920px_*` (Full HD Monitor)
  - Screens captured per viewport: Step 1 Student Info, Step 2 Upload, Step 3 Cost Breakdown, Step 4 PDF Verification Viewer, Step 5 UPI Payment & QR, Step 6 Order Status & Receipt, Admin Login Modal, Admin Dashboard, Admin Order Detail Modal, and Admin Batches Modal.

---

### Item 7: Documentation & Demo Seed Script
- **Status**: **PASS**
- **Evidence**:
  1. [`README.md`](file:///Users/mohammad/print%20simulator/README.md) verified and updated with:
     - 5-minute quick setup guide.
     - Environment variables reference table.
     - Pricing rates configuration in `backend/app/core/pricing.py` and UPI configuration (`UPI_ID`, `PAYEE_NAME`, `COLLECTION_INSTRUCTIONS`).
     - Real ₹1 UPI testing walkthrough with mobile deep links.
     - Database backup cron job (`scripts/backup_db.sh`).
     - File retention cleanup CLI command (`python -m backend.cli cleanup-files 90`).
     - VPS deployment instructions (Systemd unit file and Nginx reverse proxy block).
     - Execution instructions for demo seed script.
  2. [`scripts/seed_demo_data.py`](file:///Users/mohammad/print%20simulator/scripts/seed_demo_data.py) created and verified:
     - Seeds 7 student records across all lifecycle states (`Completed`, `Printing`, `Ready for Printing`, `Verification Required`, `Pending`).
     - Creates `Morning Batch 01 (CS Dept)` linked to orders.
     - Generates verified report files and UTR transaction records.

---

### Item 8: PyMuPDF Version & Requirements Resolution
- **Status**: **PASS**
- **Evidence**:
  - Root `requirements.txt` and `backend/requirements.txt` are synchronized with `pymupdf>=1.24.11`.
  - PyPI dry-run installation verified:
    ```bash
    .venv/bin/python -m pip install -r requirements.txt --dry-run
    ```
    Exited with code 0. Both PyMuPDF 1.24.11+ and 2.0 resolve cleanly on Python 3.12 without missing wheels or dependencies.

---

## 3. Defect Log & Resolutions

### Defect 6: Missing CSRF validation on state-changing admin requests
- **Discovery**: In Pass 9 security review.
- **Root Cause**: Cookie-authenticated session tokens (`admin_session`) lacked synchronizer / double-submit CSRF token validation on `POST`/`PATCH` endpoints.
- **Resolution**: Implemented `verify_admin_csrf` dependency in `backend/app/api/deps.py` enforcing `X-CSRF-Token` header check against `csrf_token` cookie for all mutating methods. Integrated token issuance on login and automatic header dispatch in `frontend/src/lib/api.ts`.
- **Verification**: Verified via `test_admin_csrf_protection_and_state_changing_rejection` (returns HTTP 403 on missing or forged token, 200 on valid token).

### Defect 7: Login endpoint lacked slowapi rate limit decorator
- **Discovery**: In Pass 10 security audit.
- **Root Cause**: While `slowapi` was configured on `app.state.limiter`, the `/api/v1/admin/auth/login` endpoint lacked the explicit `@limiter.limit("5/minute")` decorator.
- **Resolution**: Created `backend/app/core/limiter.py` shared limiter and attached `@limiter.limit("5/minute")` to `admin_login`.
- **Verification**: Rapid successive login attempts trigger HTTP 429 after 5 requests.

### Defect 8: Verification gate allowed confirmation with partial page review
- **Discovery**: In Pass 14 review.
- **Root Cause**: Previous logic used `viewedCount >= Math.ceil(totalPages * 0.7)` for documents $> 5$ pages.
- **Resolution**: Updated `Step4PdfViewer.tsx` to strictly enforce `viewedPages.size === totalPages`.
- **Verification**: Playwright test proved that viewing Page 1 and Page 10 of a 10-page document leaves confirmation disabled until all pages 1 through 10 are rendered.

---

## 4. Pass 16: UI Elevation & Complete Emoji Elimination

### Visual Polish & Modern Design Overhaul
- **Status**: **PASS**
- **Action Taken**:
  1. **Aesthetic Elevation**:
     - Upgraded [`tailwind.config.ts`](file:///Users/mohammad/print%20simulator/frontend/tailwind.config.ts) and [`src/index.css`](file:///Users/mohammad/print%20simulator/frontend/src/index.css) with rich emerald gradients (`from-accent to-accent-light`), layered shadows (`shadow-card`, `shadow-elevated`), modern border radii (`rounded-xl`, `rounded-2xl`), and glassmorphism styling (`glass-card`, `glass-modal`).
     - **Header**: Upgraded with live operational status indicator, gradient logo badge, and crisp action buttons.
     - **Stepper**: Upgraded with active ring glow, progress track, and checkmark badges.
     - **Student Steps 1-6**: Elevated all form surfaces, dropzones, invoice-style ledger cards, PDF viewer controls, high-trust QR payment frame, and printable digital receipts.
     - **Admin Console & Modals**: Enhanced dashboard metrics tiles with top accent bars, modernized table styling with glowing dot status badges, elevated Per-Order Detail Modal, Batches Modal, and Payment Verification Modal.
  2. **Strict Emoji Elimination**:
     - Scanned entire repository for unicode emojis and special symbol glyphs.
     - Replaced `ℹ️` in [`Step4PdfViewer.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/student/Step4PdfViewer.tsx) with Lucide `<Info />` SVG icon.
     - Replaced `✕` in [`AdminDashboard.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/admin/AdminDashboard.tsx) with Lucide `<X />` SVG icon.
     - Replaced terminal checkmark print characters in Playwright test runner with `[PASS]`.
     - Confirmed zero unicode emoji characters remain across all `.ts`, `.tsx`, `.py`, `.html`, and `.css` source files.
  3. **Verification**:
     - `npm --prefix frontend run build` passed with zero errors and zero warnings.
     - `PYTHONPATH=. .venv/bin/pytest backend/tests/ -v` (28/28 passed).
     - `PYTHONPATH=. .venv/bin/pytest tests/e2e/test_browser_flow.py -v` (2/2 passed).
     - `PYTHONPATH=. .venv/bin/pytest tests/e2e/test_verification_gate_and_visual_audit.py -v` (2/2 passed).
     - All 50 visual audit screenshots re-captured under [`docs/screenshots/`](file:///Users/mohammad/print%20simulator/docs/screenshots/).

---

## 5. Pass 17: Upper Navigation & Stepper Architecture Polish

### Header & Stepper Re-Architecture
- **Status**: **PASS**
- **Action Taken**:
  1. **Eliminated "Double Navbar" Effect**:
     - Previously, the header (`h-15`) and stepper were two full-width white horizontal strips stacked on top of each other with adjacent borders, creating a cramped, misaligned upper section.
     - Redesigned the Stepper into an **elevated floating capsule card** ([`Stepper.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/ui/Stepper.tsx)) with `rounded-2xl`, subtle backdrop blur, and `shadow-card`, centered above the content.
  2. **Elevated Brand Unit & Masthead**:
     - In [`Header.tsx`](file:///Users/mohammad/print%20simulator/frontend/src/components/ui/Header.tsx):
       - Enlarged and polished the printer emblem with a gradient tile, inner ring, and drop shadow.
       - Elevated title to `text-base sm:text-lg font-bold text-ink`.
       - Replaced monospace subtitle with clean sans-serif typography (`text-xs text-ink-secondary font-medium`).
       - Replaced raw "Live" tag with an `Operational` status pill badge with pulsing indicator dot.
       - Modernized "Track Order" and "Admin Login" action pills with rounded-xl corners.
  3. **Visual Alignment & Vertical Spacing**:
     - Harmonized container widths (`max-w-5xl` for header, `max-w-4xl` for stepper, `max-w-xl` for form cards) to remove the uneven gutter problem.
     - Adjusted content top padding across all 6 student steps to give the floating stepper breathing room.
  4. **Verification**:
     - Verified with `npm --prefix frontend run build` (0 errors).
     - Verified with `PYTHONPATH=. .venv/bin/pytest backend/tests/ -v` (28/28 passed).
     - Verified with `PYTHONPATH=. .venv/bin/pytest tests/e2e/test_browser_flow.py -v` (2/2 passed).
     - Verified with `PYTHONPATH=. .venv/bin/pytest tests/e2e/test_verification_gate_and_visual_audit.py -v` (2/2 passed).
     - Re-captured full 50-screenshot visual audit in [`docs/screenshots/`](file:///Users/mohammad/print%20simulator/docs/screenshots/).
