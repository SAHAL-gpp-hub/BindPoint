# Architecture & Product Decisions Log

This document records the foundational decisions, confirmed defaults, and architectural assumptions for the **College Project Report Printing Management Web App**.

---

## 1. Confirmed Step 0 Parameters

| # | Parameter | Decision / Value | Rationale |
|---|---|---|---|
| **1** | **Enrollment Number Format** | `^\d{12}$` (12 numeric digits, GTU standard) | Strict client & server validation prevents typos and maintains uniformity. |
| **2** | **Max PDF File Size** | 50 MB (`MAX_FILE_SIZE_MB=50`) | Accommodates high-resolution diagrams while guarding memory and disk. |
| **3** | **Page Size & Geometry** | Standard A4: $210 \times 297\text{ mm}$ ($595.28 \times 841.89\text{ pt}$) with $\pm 2\text{ mm}$ tolerance ($\approx 5.67\text{ pt}$). Mixed/non-A4 pages result in a blocking error listing the exact page numbers (e.g. `Pages 3, 7 have non-A4 dimensions`). | Prevents paper jam and formatting disaster at physical print duplex station. |
| **4** | **Payment VPA & Payee Details** | Loaded exclusively from `.env` (`UPI_ID`, `PAYEE_NAME`, `COLLECTION_INSTRUCTIONS`). Never committed or hardcoded. Default `.env.example` provided. | Security and flexibility across environments. |
| **5** | **Admin Authentication** | Single admin account seeded from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Password hashed with Argon2id at startup. Session stored in secure, `httpOnly`, `SameSite=Lax` cookie with anti-CSRF token. | Simple, robust, leak-proof auth without external OAuth/IAM bloat. |
| **6** | **Student Order Re-access** | Order ID (e.g., `PR-261031-ABCD`) + matching 10-digit Mobile Number. | No student passwords, zero friction, privacy-isolated receipt & status tracking. |
| **7** | **Duplicate Order Policy** | At most one active (non-cancelled, non-completed) order per enrollment number. Uploading identical PDF hash for the same enrollment is blocked. Student can replace PDF before payment submission (invalidates previous verification). | Prevents double payment and chaotic print queue. |
| **8** | **Unique Paise Amounts** | Default: `OFF` (`UNIQUE_PAISE_AMOUNT=false`). All orders have `.00` paise unless explicitly enabled for bank statement micro-matching. | Keeps pricing clean and intuitive for students unless admin specifically toggles. |
| **9** | **File Retention** | 90 days after completion (`FILE_RETENTION_DAYS=90`). Handled by CLI command `python -m backend.cli cleanup-files`. | Protects student confidentiality and storage quotas. |
| **10** | **Deployment Target** | Local development (FastAPI backend + React Vite frontend) + PostgreSQL in `docker-compose.yml`. Production VPS guide in README. | Fast iterative developer loop with zero extraneous dependencies. |

---

## 2. Business Logic & Invariants

1. **Pricing Rule (Single Source of Truth in Backend):**
   - $N = \text{total PDF pages}$. If $N < 2$, immediate rejection with error.
   - $\text{colour\_sides} = N - 1$
   - $\text{normal\_sheets} = \lceil (N - 1) / 2 \rceil$
   - $\text{blank\_sides} = (\text{normal\_sheets} \times 2) - \text{colour\_sides}$ (0 or 1)
   - $\text{special\_cost} = 20$ (First page = 10, Extra blank special sheet = 10)
   - $\text{colour\_cost} = \text{colour\_sides} \times 5$
   - $\text{total} = \text{special\_cost} + \text{colour\_cost}$
   - The extra special blank sheet is physical only; it is never injected into the PDF or PDF preview.
   - The frontend *never* calculates or modifies the price.

2. **Verification Gate (Server-Enforced):**
   - Verification record stores `confirmed_hash`, `confirmed_page_count`, and `confirmed_at`.
   - Payment endpoints strictly refuse unless `confirmed_hash == report.pdf_hash` and `confirmed_page_count == report.page_count`.
   - Replacing the PDF resets verification to unverified and recalculates pricing.
   - UI gate tracks that student has scrolled/viewed page 1, page $N$, and every intermediate page before enabling "My PDF is final".

3. **Payment Mode (`manual_upi`):**
   - Mobile: `upi://pay` deep link (`pa`, `pn`, `am`, `cu=INR`, `tn`). Secondary: "Show QR instead" and "Copy UPI ID / Amount".
   - Desktop: QR code generated via library, instructions, copy buttons.
   - Submission: Mandatory 12-digit UTR (globally unique constraint in DB), optional payer UPI ID, optional screenshot image.
   - Client submission changes status to `Verification Required`. Client action *cannot* mark an order `Successful`.
   - Admin queue verifies UTR against bank/UPI app and confirms or rejects with a reason.
