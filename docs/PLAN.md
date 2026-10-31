# Implementation Plan: College Project Report Printing Management Web App

This document outlines the complete architectural design, database schemas, state machines, API contracts, frontend/backend folder layouts, and comprehensive test suite mapped to the project specifications.

---

## 1. Database Schema (PostgreSQL & SQLAlchemy 2.x)

### 1.1 Tables Overview

```
                               ┌───────────────────────────┐
                               │          admins           │
                               ├───────────────────────────┤
                               │ id (UUID, PK)             │
                               │ email (VARCHAR, UNIQUE)   │
                               │ password_hash (VARCHAR)   │
                               │ created_at (TIMESTAMP)    │
                               └───────────────────────────┘

┌───────────────────────────────┐               ┌─────────────────────────────────┐
│           students            │               │             orders              │
├───────────────────────────────┤               ├─────────────────────────────────┤
│ id (UUID, PK)                 │ 1           * │ id (VARCHAR(20), PK) [PR-YYMMDD]│
│ full_name (VARCHAR)           │──────────────<│ student_id (UUID, FK)           │
│ enrollment_number (VARCHAR)   │               │ report_id (UUID, FK, UNIQUE)    │
│ mobile_number (VARCHAR(10))   │               │ payment_status (VARCHAR(30))    │
│ created_at (TIMESTAMP)        │               │ print_status (VARCHAR(30))      │
│ UNIQUE(enrollment_number)     │               │ batch_id (UUID, FK, NULLABLE)   │
└───────────────────────────────┘               │ created_at (TIMESTAMP)          │
                                                │ completed_at (TIMESTAMP, NULL)  │
                                                └────────────────┬────────────────┘
                                                                 │ 1
                                                                 │
                                     ┌───────────────────────────┼───────────────────────────┐
                                     │ 1                         │ 1                         │ *
                                     ▼                           ▼                           ▼
                      ┌────────────────────────────┐ ┌──────────────────────────┐ ┌──────────────────────────┐
                      │          reports           │ │         payments         │ │      activity_logs       │
                      ├────────────────────────────┤ ├──────────────────────────┤ ├──────────────────────────┤
                      │ id (UUID, PK)              │ │ id (UUID, PK)            │ │ id (UUID, PK)            │
                      │ original_filename (VARCHAR)│ │ order_id (VARCHAR, FK)   │ │ order_id (VARCHAR, FK)   │
                      │ stored_filename (VARCHAR)  │ │ amount (NUMERIC(8,2))    │ │ actor_type (VARCHAR)     │
                      │ file_size (BIGINT)         │ │ utr_number (VARCHAR(12)) │ │ actor_id (VARCHAR, NULL) │
                      │ page_count (INT)           │ │ payer_vpa (VARCHAR, NULL)│ │ from_state (VARCHAR,NULL)│
                      │ pdf_hash (VARCHAR(64))     │ │ screenshot_path (VARCHAR)│ │ to_state (VARCHAR)       │
                      │ colour_pages (INT)         │ │ status (VARCHAR(30))     │ │ note (TEXT, NULL)        │
                      │ normal_sheets (INT)        │ │ rejection_reason (TEXT)  │ │ created_at (TIMESTAMP)   │
                      │ special_sheets (INT)       │ │ confirmed_by (UUID, FK)  │ └──────────────────────────┘
                      │ blank_sides (INT)          │ │ confirmed_at (TIMESTAMP) │
                      │ total_amount (NUMERIC(8,2))│ │ created_at (TIMESTAMP)   │
                      │ created_at (TIMESTAMP)     │ │ UNIQUE(utr_number)       │
                      └──────────────┬─────────────┘ └──────────────────────────┘
                                     │ 1
                                     ▼ 1
                      ┌────────────────────────────┐
                      │    report_verifications    │
                      ├────────────────────────────┤
                      │ id (UUID, PK)              │
                      │ report_id (UUID, FK)       │
                      │ confirmed_hash (VARCHAR)   │
                      │ confirmed_page_count (INT) │
                      │ is_final (BOOLEAN)         │
                      │ confirmed_at (TIMESTAMP)   │
                      └────────────────────────────┘
```

### 1.2 Table Definitions & Constraints

1. **`students`**:
   - `id`: UUID Primary Key.
   - `full_name`: `VARCHAR(100)`, Not Null.
   - `enrollment_number`: `VARCHAR(20)`, Not Null, `UNIQUE`, Indexed.
   - `mobile_number`: `VARCHAR(10)`, Not Null, Indexed.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.

2. **`reports`**:
   - `id`: UUID Primary Key.
   - `original_filename`: `VARCHAR(255)`, Not Null.
   - `stored_filename`: `VARCHAR(255)`, Not Null, Unique.
   - `file_size`: `BIGINT`, Not Null.
   - `page_count`: `INTEGER`, Not Null.
   - `pdf_hash`: `VARCHAR(64)` (SHA-256), Not Null, Indexed.
   - `colour_pages`: `INTEGER`, Not Null ($N-1$).
   - `normal_sheets`: `INTEGER`, Not Null ($\lceil(N-1)/2\rceil$).
   - `special_sheets`: `INTEGER`, Not Null ($2$).
   - `blank_sides`: `INTEGER`, Not Null ($0 \text{ or } 1$).
   - `special_paper_cost`: `NUMERIC(8,2)`, Not Null ($₹20.00$).
   - `colour_printing_cost`: `NUMERIC(8,2)`, Not Null ($(\text{colour\_pages}) \times 5$).
   - `total_amount`: `NUMERIC(8,2)`, Not Null.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.

3. **`report_verifications`**:
   - `id`: UUID Primary Key.
   - `report_id`: UUID Foreign Key referencing `reports.id` ON DELETE CASCADE.
   - `confirmed_hash`: `VARCHAR(64)`, Not Null.
   - `confirmed_page_count`: `INTEGER`, Not Null.
   - `is_final`: `BOOLEAN`, Not Null, Default `False`.
   - `confirmed_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.
   - Constraint: `UNIQUE(report_id, confirmed_hash)`.

4. **`orders`**:
   - `id`: `VARCHAR(20)` Primary Key (Format: `PR-YYMMDD-XXXX` with secure random alphanumerics).
   - `student_id`: UUID Foreign Key referencing `students.id`.
   - `report_id`: UUID Foreign Key referencing `reports.id`.
   - `payment_status`: `VARCHAR(30)` (`Pending`, `Verification Required`, `Successful`, `Failed`, `Refunded`).
   - `print_status`: `VARCHAR(30)` (`Submitted`, `Ready for Printing`, `Printing`, `Completed`, `Cancelled`).
   - `batch_id`: UUID Foreign Key referencing `print_batches.id`, Nullable.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null, Indexed.
   - `completed_at`: `TIMESTAMP WITH TIME ZONE`, Nullable.
   - Indexes: `(enrollment_number, created_at)`, `(payment_status, print_status)`.

5. **`payments`**:
   - `id`: UUID Primary Key.
   - `order_id`: `VARCHAR(20)` Foreign Key referencing `orders.id` ON DELETE CASCADE.
   - `amount`: `NUMERIC(8,2)`, Not Null.
   - `utr_number`: `VARCHAR(12)`, Nullable, `UNIQUE` (where not null).
   - `payer_vpa`: `VARCHAR(100)`, Nullable.
   - `screenshot_path`: `VARCHAR(255)`, Nullable.
   - `status`: `VARCHAR(30)` (`Pending`, `Verification Required`, `Successful`, `Rejected`).
   - `rejection_reason`: `TEXT`, Nullable.
   - `confirmed_by`: UUID Foreign Key referencing `admins.id`, Nullable.
   - `confirmed_at`: `TIMESTAMP WITH TIME ZONE`, Nullable.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.

6. **`print_batches`**:
   - `id`: UUID Primary Key.
   - `batch_name`: `VARCHAR(100)`, Not Null.
   - `created_by`: UUID Foreign Key referencing `admins.id`.
   - `total_reports`: `INTEGER`, Not Null.
   - `total_pages`: `INTEGER`, Not Null.
   - `total_sheets`: `INTEGER`, Not Null.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.

7. **`activity_logs`**:
   - `id`: UUID Primary Key.
   - `order_id`: `VARCHAR(20)` Foreign Key referencing `orders.id` ON DELETE CASCADE.
   - `actor_type`: `VARCHAR(20)` (`student`, `admin`, `system`).
   - `actor_id`: `VARCHAR(100)`, Nullable.
   - `from_state`: `VARCHAR(50)`, Nullable.
   - `to_state`: `VARCHAR(50)`, Not Null.
   - `note`: `TEXT`, Nullable.
   - `created_at`: `TIMESTAMP WITH TIME ZONE`, Not Null.

---

## 2. State Machines

### 2.1 Verification State Machine
```
[Uploaded PDF]
      │
      ▼
[In Review] ── (Scroll Page 1, Page N, All Pages) ──► [Viewer Check Complete]
      │                                                        │
      ├───────────────── "I need to make changes" ────────────┤ (Replace PDF)
      │                                                        ▼
      │                                                [My PDF is Final]
      │                                                        │
      │                                                        ▼
      └─────────────────────────────────────────────── [Verified Record Created]
                                                        (confirmed_hash = pdf_hash)
```
- **Rule**: If the student replaces the PDF at any point, any existing verification record is invalidated, pricing is recalculated, and the state reverts to `In Review`.

### 2.2 Payment State Machine (`manual_upi`)
```
[Order Created] ──► payment_status: "Pending"
                         │
                         ▼ (Student pays via UPI & submits 12-digit UTR)
                    payment_status: "Verification Required"
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
     [Admin Confirms]          [Admin Rejects with Reason]
            │                         │
            ▼                         ▼
payment_status: "Successful"   payment_status: "Pending" (or "Failed")
print_status: "Ready for Print" student re-prompts to submit valid UTR
```
- **Rule**: Client submission **never** marks an order paid. Only the admin's deliberate confirmation transition sets `payment_status = "Successful"` and updates `print_status = "Ready for Printing"`.

### 2.3 Print Lifecycle State Machine
```
[Submitted] ──► [Ready for Printing] (triggered on payment confirmation)
                     │
                     ▼ (Admin moves to print station / batch)
                 [Printing]
                     │
                     ▼ (Printed, inspected & bound)
                [Completed] (completed_at set)
```
- An order can be marked `Cancelled` by admin with a reason at any stage prior to `Completed`.

---

## 3. API Endpoints Specification

### 3.1 Public Student Endpoints

| Method | Endpoint | Description | Auth / Rate Limit |
|---|---|---|---|
| `POST` | `/api/v1/reports/upload` | Upload PDF (multipart), validate A4 geometry, compute hash, pages, cost breakdown | 10 req/min |
| `GET` | `/api/v1/reports/{report_id}/preview` | Signed stream of PDF preview for owning session | Rate limited |
| `POST` | `/api/v1/reports/{report_id}/verify` | Submit verification ("My PDF is final") with confirmed hash & page count | 10 req/min |
| `POST` | `/api/v1/orders` | Create order from verified report + student information | 10 req/min |
| `GET` | `/api/v1/orders/{order_id}` | Retrieve order status & summary (requires `mobile` query or session token) | 30 req/min |
| `POST` | `/api/v1/orders/{order_id}/payment` | Submit UTR, optional payer VPA, and optional screenshot | 5 req/min |
| `GET` | `/api/v1/orders/{order_id}/receipt` | Download printable/PDF receipt | 20 req/min |

### 3.2 Authenticated Administrator Endpoints

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | Email + password login, sets httpOnly session cookie | 5 req/min, slowapi |
| `POST` | `/api/v1/admin/auth/logout` | Clears admin session cookie | Admin session |
| `GET` | `/api/v1/admin/auth/me` | Check session validity | Admin session |
| `GET` | `/api/v1/admin/dashboard/metrics` | Operational counts (submissions, pending, printing, completed, revenue) | Admin session |
| `GET` | `/api/v1/admin/orders` | List orders with pagination, search, status filters, date range | Admin session |
| `GET` | `/api/v1/admin/orders/{order_id}` | Detailed order view with PDF preview, payment details, timeline log | Admin session |
| `GET` | `/api/v1/admin/orders/{order_id}/pdf` | Stream/download original PDF file | Admin session |
| `GET` | `/api/v1/admin/orders/{order_id}/screenshot` | View uploaded payment screenshot | Admin session |
| `POST` | `/api/v1/admin/orders/{order_id}/payment/confirm` | Confirm payment with received amount | Admin session |
| `POST` | `/api/v1/admin/orders/{order_id}/payment/reject` | Reject payment with reason | Admin session |
| `PATCH` | `/api/v1/admin/orders/{order_id}/print-status` | Update print status (`Ready for Printing` -> `Printing` -> `Completed`) | Admin session |
| `POST` | `/api/v1/admin/batches` | Create a print batch for selected orders | Admin session |
| `POST` | `/api/v1/admin/batches/export-zip` | Download selected orders as sanitized ZIP (`{Enrollment}_{Name}_Report.pdf`) | Admin session |
| `GET` | `/api/v1/admin/export/csv` | Export order registry to CSV | Admin session |
| `GET` | `/api/v1/admin/export/xlsx` | Export order registry to XLSX with Excel styling | Admin session |

---

## 4. Frontend & Backend Folder Structure

```
print-simulator/
├── .env.example
├── docker-compose.yml           # PostgreSQL only
├── Makefile                     # Convenient run / test / lint targets
├── docs/
│   ├── SPEC.md
│   ├── PLAN.md
│   ├── DESIGN.md
│   ├── DECISIONS.md
│   └── QA_LOG.md
├── scripts/
│   ├── make_test_pdfs.py        # Generates test PDFs (1,2,3,10,11,20,21,50, corrupt, etc.)
│   ├── seed_admin.py            # CLI seed/reset admin account
│   └── backup_db.sh             # PostgreSQL backup script
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── alembic.ini
│   ├── pyproject.toml / requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py              # FastAPI application factory & middleware
│       ├── config.py            # Pydantic BaseSettings (.env loading)
│       ├── database.py          # SQLAlchemy async/sync session engine
│       ├── models/              # SQLAlchemy 2.0 ORM models
│       ├── schemas/             # Pydantic v2 schemas
│       ├── core/
│       │   ├── pricing.py       # PURE PRICING FUNCTION & INVARIANTS
│       │   ├── pdf.py           # PyMuPDF parser, geometry & hash checker
│       │   ├── security.py      # Argon2 hashing, signed tokens, cookies
│       │   └── ratelimit.py     # slowapi rate limiter
│       ├── api/
│       │   ├── deps.py          # Auth & DB dependencies
│       │   └── v1/
│       │       ├── reports.py
│       │       ├── orders.py
│       │       ├── payments.py
│       │       └── admin.py
│       └── tests/
│           ├── test_pricing.py  # Pure pricing unit tests
│           ├── test_pdf.py      # PyMuPDF validation tests
│           ├── test_orders.py   # Flow & verification gate tests
│           └── test_admin.py    # Admin operations & export tests
└── frontend/
    ├── package.json
    ├── tsconfig.json            # Strict TypeScript configuration
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── index.css
        ├── main.tsx
        ├── App.tsx
        ├── types/               # TypeScript interfaces
        ├── lib/
        │   ├── api.ts           # Axios / fetch client with CSRF & error handling
        │   └── formatters.ts    # Date, currency, file size formatters
        ├── components/
        │   ├── ui/              # Button, Input, Modal, Toast, Badge
        │   ├── student/
        │   │   ├── Stepper.tsx
        │   │   ├── Step1Info.tsx
        │   │   ├── Step2Upload.tsx
        │   │   ├── Step3CostBreakdown.tsx
        │   │   ├── Step4PdfViewer.tsx
        │   │   ├── Step5Payment.tsx
        │   │   └── Step6Confirmation.tsx
        │   └── admin/
        │       ├── AdminHeader.tsx
        │       ├── MetricsStrip.tsx
        │       ├── OrdersTable.tsx
        │       ├── PaymentQueueModal.tsx
        │       ├── BulkActionBar.tsx
        │       └── OrderDetailDrawer.tsx
        └── pages/
            ├── StudentPortal.tsx
            ├── OrderStatusPage.tsx
            └── AdminPortal.tsx
```

---

## 5. Test Plan & QA Mapping (Mapped to Spec Section 15 Phase 5)

| Test Category | Target Scenarios | Verification Tool |
|---|---|---|
| **Pricing Engine** | $N=0, 1$ (rejection); $N=2 \to ₹25$; $N=3 \to ₹30$; $N=10 \to ₹65$; $N=11 \to ₹70$; $N=20 \to ₹115$; $N=21 \to ₹120$; $N=50 \to ₹265$; $N=500$. | `pytest tests/test_pricing.py` |
| **PDF Ingestion** | 1 page, corrupt bytes, encrypted/password, non-PDF extension, oversized (>50MB), non-A4 pages (reports exact offending page numbers). | `pytest tests/test_pdf.py` |
| **Verification Gate** | Attempt order creation or payment without verification $\to 400/403$; stale verification after replacing PDF $\to 400$; hash mismatch $\to 400$. | `pytest tests/test_orders.py` |
| **Payment Flow** | Submit valid 12-digit UTR $\to$ `Verification Required`; reused UTR $\to$ blocked by DB unique constraint; admin confirm $\to$ `Successful` + `Ready for Printing`; admin reject $\to$ student can resubmit. | `pytest tests/test_orders.py` |
| **End-to-End (E2E)** | Mobile Viewport ($360\times 800$, $390\times 844$) and Desktop ($1280\times 800$): Complete Student Flow, PDF viewer scroll & confirmation, UPI intent & QR, UTR submission, Admin login, filter, batch summary, ZIP export. | Playwright (`tests/e2e/`) |
| **Responsive QA** | Zero visual overflow, sticky action bars at safe insets, no iOS input zoom ($16\text{px}$ inputs), accessible keyboard traps. | Playwright screenshots & browser audit |
