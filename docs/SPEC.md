> **NOTE FOR THE BUILDER:** Section 6 (Payment Workflow) and the Razorpay/webhook items in Sections 12 and 13 are OVERRIDDEN by the main kickoff prompt. Use `PAYMENT_MODE=manual_upi` (UPI deep link / QR + student submits 12-digit UTR + admin confirmation). Do not build Razorpay. Everything else in this spec stands.

# Build a Premium College Project Report Printing Management Web App

## 1. Project Overview

I want to build a modern, responsive web application that simplifies the process of collecting, reviewing, pricing, and managing college project reports for printing.

### The Problem

When multiple students need to print their project reports, managing everything manually becomes inconvenient:

- Collecting student details individually.
- Receiving and organizing PDF reports.
- Checking the number of pages.
- Calculating printing costs manually.
- Ensuring students have checked their reports before printing.
- Tracking payments.
- Keeping records of submitted reports.
- Managing multiple reports efficiently at the print station.

### The Solution

Develop a simple but professionally designed web application where students can:

1. Enter their personal and academic information.
2. Upload their project report in PDF format only.
3. Automatically receive a printing cost calculation.
4. Preview and carefully verify their entire PDF.
5. Confirm that their PDF is final.
6. Complete the payment process.
7. Receive an order confirmation.

As the administrator, I should be able to manage all submissions, access reports, verify payments, organize bulk printing, and maintain student records through a dedicated dashboard.

**Important project scope:** This application is exclusively for me and my group. It is not intended to be a public printing platform, multi-organization SaaS, or multi-group management system.

Keep the implementation focused and avoid unnecessary complexity.

---

# 2. Design Philosophy & Visual Direction

The application must have an exceptionally polished UI and excellent UX.

I do not want it to look like a typical AI-generated dashboard or a generic template.

### Desired aesthetic

Create a premium, minimalist, professional interface inspired by well-designed fintech products and modern productivity applications.

Design characteristics:

- Excellent typography and visual hierarchy.
- Carefully selected neutral colours and accent colours.
- Consistent spacing and alignment.
- Subtle borders and restrained shadows.
- Clean, structured layouts.
- Purposeful micro-interactions.
- Smooth transitions.
- Intuitive navigation.
- Excellent responsive behaviour.
- Clear visual feedback for every action.

### Avoid

- Generic blue-purple gradients.
- Excessive rounded cards.
- Unnecessary glassmorphism.
- Random decorative icons.
- Oversized headings.
- Excessive empty space.
- Unnecessary animations.
- Repetitive dashboard cards.
- Generic AI-generated SaaS layouts.
- Making every section look like a separate card.

The design should feel like a professionally designed commercial product, not a college assignment.

Prioritize usability and information hierarchy over decorative elements.

---

# 3. Student Submission Workflow

Build the student-facing experience as a guided, multi-step workflow.

The complete journey should be:

**Student Details → PDF Upload → Automatic Analysis → Cost Calculation → PDF Verification → Payment → Order Confirmation**

Show a clear progress indicator throughout the process.

## Step 1: Student Information

Collect the following information:

- Full Name
- Enrollment Number
- Mobile Number

### Validation

- All fields are mandatory.
- Mobile number must be a valid Indian 10-digit number.
- Enrollment number must follow the configured college format.
- Prevent accidental duplicate submissions.
- Preserve entered information when navigating between steps.
- Display helpful validation messages.

Keep the form clean and minimal.

## Step 2: Upload Project Report

Allow students to upload their project report.

### File requirements

- PDF format only.
- Configurable maximum file size.
- Display filename and file size.
- Show upload progress.
- Allow replacing or removing the uploaded PDF.
- Validate that the PDF is readable and not corrupted.
- Reject password-protected PDFs unless supported.
- Handle upload failures gracefully.

After upload, automatically extract:

- Total PDF page count.
- Page dimensions.
- Document metadata where available.
- File size.
- File hash for document identification.

Do not trust the filename or metadata to determine the actual page count. Read the PDF itself.

---

# 4. Printing Cost Calculation Engine

This is one of the most important parts of the application.

The pricing calculation must follow the exact physical printing arrangement described below.

## Actual Printing Arrangement

Every report follows this printing process:

### A. First PDF Page – Special Paper

- The first page of the uploaded PDF is printed on special paper.
- Project details are printed on one side.
- The reverse side remains blank.
- Cost: ₹10.

### B. Remaining PDF Pages – Normal Colour Printing

- All PDF pages from page 2 through the last page are printed in normal colour.
- This INCLUDES the last page of the uploaded PDF.
- Duplex printing is used, meaning two printed sides per physical sheet wherever possible.
- Cost: ₹5 per printed side.
- If the number of normal colour pages is odd, the final physical sheet has one blank side.

### C. Additional Blank Special-Paper Sheet

- After the complete PDF has been printed, an additional special-paper sheet is inserted.
- Both sides of this additional sheet remain blank.
- This is NOT part of the uploaded PDF.
- Cost: ₹10.

### Total Special-Paper Cost

| Special-paper component | Cost |
|---|---:|
| First PDF page | ₹10 |
| Additional blank special-paper sheet | ₹10 |
| **Total** | **₹20** |

## Final Pricing Formula

Let:

`N = Total number of uploaded PDF pages`

Then:

`Normal Colour Pages = N - 1`

`Normal Physical Sheets = CEILING((N - 1) / 2)`

`Normal Printing Cost = (N - 1) × ₹5`

`Special Paper Cost = ₹20`

**Final formula:**

`Total Printing Cost = ₹20 + ((N - 1) × ₹5)`

The ₹5 charge applies to every normal colour-printed side, not every physical sheet.

### Example Calculations

| PDF pages | Normal colour pages | Normal physical sheets | Special paper | Total |
|---:|---:|---:|---:|---:|
| 10 | 9 | 5 | ₹20 | ₹65 |
| 20 | 19 | 10 | ₹20 | ₹115 |
| 30 | 29 | 15 | ₹20 | ₹165 |
| 40 | 39 | 20 | ₹20 | ₹215 |
| 50 | 49 | 25 | ₹20 | ₹265 |

### Important Calculation Rules

1. The first PDF page is excluded from normal colour printing.
2. Every remaining PDF page, including the last PDF page, is charged at ₹5.
3. The additional blank special-paper sheet is charged separately.
4. The additional special-paper sheet must never be counted as a PDF page.
5. Duplex printing determines the physical sheet count, not the number of charged printed sides.
6. An odd number of normal colour pages results in one unused side.
7. Do not charge for blank sides.
8. The calculation must be performed on the backend.
9. Replacing the uploaded PDF must automatically trigger a fresh calculation.

### Edge Cases

Handle:

- Invalid PDFs.
- Corrupted PDFs.
- Password-protected PDFs.
- PDFs with fewer than two pages.
- Empty documents.
- Odd and even page counts.
- Unusually large PDFs.
- Incorrect or unsupported page dimensions.

For documents that do not satisfy the required printing arrangement, display a clear error instead of silently calculating an incorrect amount.

### Cost Breakdown UI

After PDF analysis, show a transparent cost breakdown.

Display:

- Total PDF pages.
- First special-paper page.
- Normal colour-printed pages.
- Number of normal physical sheets.
- Number of colour-printed sides.
- Number of blank sides.
- Additional blank special-paper sheet.
- Special-paper cost.
- Normal colour printing cost.
- Final estimated amount.

The final price should be visually clear without making the interface unnecessarily cluttered.

Pricing values should be stored centrally so that they can be adjusted easily if the print station's rates change.

---

# 5. Mandatory PDF Verification

**THIS IS A MANDATORY STEP. NO STUDENT SHOULD BE ABLE TO SKIP IT.**

Before proceeding to payment, every student must carefully review the complete uploaded report.

The application must provide a proper PDF preview experience.

## PDF Viewer Features

- Embedded PDF viewer.
- Page thumbnails.
- Page navigation.
- Previous and next page controls.
- Zoom in and zoom out.
- Fit-to-width.
- Fit-to-page.
- Full-screen preview.
- Current page indicator (e.g. Page 4 of 32).
- Total page count.
- Smooth navigation.

Clearly identify:

- First PDF page – Special paper.
- Remaining PDF pages – Normal colour printing.
- Last PDF page – Normal colour printing.
- Additional blank special-paper sheet – Inserted separately.

The additional blank special-paper sheet must be represented in the printing instructions, not added to the uploaded PDF preview.

## Mandatory Confirmation

After reviewing the PDF, display this confirmation:

"Have you carefully checked your complete PDF, including the first page, last page, formatting, diagrams, images, page numbers, and overall content? Once confirmed, your document will be considered final for printing."

Provide two clear actions:

### Option 1: I Need to Make Changes

- Return to the upload stage.
- Allow the student to replace the PDF.
- Recalculate the printing cost.
- Reset the previous verification status.
- Require reviewing the new PDF again.

### Option 2: My PDF Is Final

- Record the student's confirmation.
- Record the verification timestamp.
- Record the PDF hash and confirmed page count.
- Allow proceeding to payment.

### Verification Rules

- Verification must be mandatory.
- Do not allow payment without confirmation.
- If the uploaded PDF changes, invalidate the previous confirmation.
- Store verification history.
- Never assume that opening the PDF automatically means it has been verified.

---

# 6. Payment Workflow

After successful PDF verification, take the student to the payment stage.

Display:

- Student name.
- Enrollment number.
- Report filename.
- Total PDF pages.
- Printing breakdown.
- Final payable amount.

### Preferred Payment Method

UPI payment through a QR code or a suitable Indian payment gateway.

Suggested payment provider: Razorpay.

### Payment Statuses

- Pending.
- Successful.
- Failed.
- Verification Required.
- Refunded, if supported.

### Payment Requirements

- Never mark an order as paid simply because the student clicks a payment button.
- Verify payment through the payment gateway or administrator confirmation.
- Store transaction reference.
- Store payment timestamp.
- Prevent duplicate payment processing.
- Handle failed and interrupted payments.
- Generate a unique order ID.

Once payment is confirmed:

- Mark the order as paid.
- Record the payment details.
- Make the report available in the administrator dashboard.
- Generate an order confirmation.

If payment gateway integration is not configured during initial development, provide an administrator-verified manual payment mode rather than pretending that online payment has been completed.

---

# 7. Student Order Confirmation

After successful submission and payment confirmation, display a professional confirmation screen.

Include:

- Unique Order ID.
- Student name.
- Enrollment number.
- Report filename.
- Total PDF pages.
- Final printing cost.
- Payment status.
- Submission date and time.

Provide:

- Order receipt.
- Payment reference.
- Order status.
- Clear collection instructions.

Students should not have access to administrative information or other students' reports.

---

# 8. Administrator Dashboard

Build a separate, secure admin dashboard.

There should be only one primary administrator: me.

The dashboard should focus on efficient order management rather than unnecessary analytics.

## Dashboard Overview

Display useful operational metrics:

- Total submissions.
- Total reports received.
- Pending payments.
- Confirmed payments.
- Ready for printing.
- Currently printing.
- Completed reports.
- Total confirmed revenue.

Keep these metrics compact and meaningful.

## Orders Management

Create a clean, searchable and filterable table.

| Field | Description |
|---|---|
| Order ID | Unique reference |
| Student Name | Full name |
| Enrollment Number | Student identification |
| Mobile Number | Contact number |
| Report | Uploaded PDF filename |
| Pages | Total PDF pages |
| Amount | Calculated cost |
| Payment | Payment status |
| Print Status | Current status |
| Submitted | Date and time |
| Actions | View, download, update |

### Administrator Actions

Allow me to:

- View complete student information.
- Preview uploaded reports.
- Download original PDFs.
- Check printing cost breakdown.
- Verify pending payments.
- Update printing status.
- Mark reports as printing.
- Mark reports as completed.
- Search by student name.
- Search by enrollment number.
- Search by order ID.
- Filter by payment status.
- Filter by print status.
- Filter by submission date.
- Export records to CSV or Excel.
- Generate individual receipts.

---

# 9. Bulk Printing Management

This is an especially important feature because the primary objective is to simplify printing multiple reports at the print station.

Build a dedicated bulk printing management experience.

### Bulk Selection

Allow the administrator to select multiple paid reports.

Show a live batch summary:

- Number of selected reports.
- Total PDF pages.
- Total normal colour-printed pages.
- Total normal physical sheets.
- Total special-paper sheets.
- Total printed sides.
- Total blank sides.
- Total printing amount.

### Bulk Download

Provide:

- Download individual PDFs.
- Download selected PDFs together as a ZIP file.
- Preserve original filenames or use a consistent naming format.
- Include enrollment numbers in filenames to identify reports easily.

Suggested filename format:

`EnrollmentNumber_StudentName_Report.pdf`

Do not automatically merge multiple student reports into one PDF.

Each report must remain an independent document.

### Batch Management

Allow the administrator to:

- Create a printing batch.
- View selected reports.
- Sort by enrollment number.
- Sort by submission time.
- Track individual report completion.
- Mark reports as printing.
- Mark completed reports.
- View batch progress.

The bulk printing workflow should be optimized for practical use at the print station.

---

# 10. Order and Print Status Management

Use a clear order lifecycle.

Suggested statuses:

1. Submitted.
2. Payment Pending.
3. Payment Confirmed.
4. Ready for Printing.
5. Printing.
6. Completed.
7. Cancelled.

Keep payment status and print status as separate fields.

For example, an order can be:

- Payment: Successful.
- Print Status: Ready for Printing.

Maintain a timestamped activity history whenever an order's status changes.

Allow the administrator to see the complete history of an individual report.

---

# 11. Database and File Management

Use a clean and maintainable database structure.

Store:

### Student Information

- Student ID.
- Full name.
- Enrollment number.
- Mobile number.

### Report Information

- Report ID.
- Order ID.
- Original filename.
- Stored filename.
- File size.
- PDF page count.
- PDF hash.
- Upload timestamp.

### Pricing Information

- Total PDF pages.
- Normal colour pages.
- Normal physical sheets.
- Printed sides.
- Blank sides.
- Special-paper sheets.
- Special-paper charges.
- Colour printing charges.
- Final amount.

### Verification Information

- Verification status.
- Verification timestamp.
- Confirmed PDF hash.
- Confirmed page count.

### Payment Information

- Payment status.
- Payment reference.
- Amount paid.
- Payment timestamp.
- Payment verification method.

### Order Information

- Unique order ID.
- Submission timestamp.
- Payment status.
- Print status.
- Completion timestamp.

### Reliability Requirements

- Proper database relationships.
- Unique order IDs.
- Secure file storage.
- Server-side PDF validation.
- Server-side price calculation.
- Protection against duplicate submissions.
- Proper error handling.
- Database backups.
- Configurable file retention.

Do not store unnecessary sensitive payment information.

Keep uploaded PDFs accessible only to authorized users.

---

# 12. Suggested Technical Architecture

Use a maintainable and practical technology stack.

### Frontend

- React.
- TypeScript.
- Tailwind CSS.
- PDF.js for PDF preview.
- Lucide icons.

### Backend

- FastAPI (Python).
- PostgreSQL.
- SQLAlchemy.
- REST API architecture.

### PDF Processing

- PyMuPDF or pypdf.
- Server-side PDF validation.
- Automatic page-count extraction.
- File hashing.
- Secure file storage.

### Payment

- Razorpay or another suitable Indian payment gateway.
- UPI support.
- Payment verification.
- Webhook integration.

The final stack can be adjusted if there is a strong technical reason.

Do not introduce unnecessary technologies or services.

---

# 13. Security and Access Control

The application is intended for a single group, but uploaded student information and reports must still be protected.

Implement:

- Secure administrator authentication.
- One administrator account.
- Public student submission page.
- Server-side input validation.
- File-type and file-content validation.
- File-size limits.
- Secure PDF download access.
- Protection against unauthorized order access.
- Rate limiting for public submissions.
- Safe database queries.
- Secure payment verification.
- Protection against duplicate requests.

Students must not be able to access other students' private submissions.

Avoid exposing direct public file-storage paths.

---

# 14. UX and Interaction Requirements

The application must remain simple for students who are not technically experienced.

### Student Experience

The student should always know:

- Which step they are currently on.
- What information is required.
- Whether the PDF uploaded successfully.
- How many pages were detected.
- How the printing cost was calculated.
- Whether the document has been verified.
- Whether payment has been confirmed.
- What happens next.

### Essential UI States

Implement:

- Loading states.
- Upload progress.
- Empty states.
- Validation errors.
- PDF processing errors.
- Payment failure states.
- Success confirmations.
- Disabled button states.
- Network error handling.

Do not leave buttons that look functional but do nothing.

Avoid unnecessary confirmation dialogs and repetitive data entry.

---

# 15. Development and Implementation Plan

Do not immediately start generating random screens or writing code without understanding the workflow.

Follow a structured development process.

### Phase 1 – Requirements and Architecture

1. Understand all business requirements.
2. Confirm the printing calculation.
3. Identify edge cases.
4. Design the database schema.
5. Define API endpoints.
6. Define student and administrator workflows.

### Phase 2 – UI/UX Design

1. Establish a consistent design system.
2. Design the student submission flow.
3. Design the PDF preview experience.
4. Design the pricing breakdown.
5. Design the payment interface.
6. Design the administrator dashboard.
7. Design bulk printing management.

### Phase 3 – Core Implementation

1. Implement student information collection.
2. Implement PDF upload and validation.
3. Implement PDF page-count extraction.
4. Implement printing cost calculation.
5. Implement PDF preview.
6. Implement mandatory PDF verification.
7. Implement order creation.

### Phase 4 – Payment and Administration

1. Implement payment workflow.
2. Implement payment verification.
3. Implement administrator authentication.
4. Implement order management.
5. Implement print status management.
6. Implement bulk PDF downloads.
7. Implement CSV/Excel exports.

### Phase 5 – Testing

Test with PDFs containing:

- 2 pages.
- 3 pages.
- 10 pages.
- 11 pages.
- 20 pages.
- 21 pages.
- 50 pages.

Verify:

- Correct page counting.
- Correct printing costs.
- Correct physical sheet calculations.
- Correct special-paper handling.
- Correct odd-page duplex handling.
- PDF replacement invalidates verification.
- Payment failures do not create paid orders.
- Duplicate submissions are prevented.
- Bulk ZIP downloads work.
- Admin status changes are recorded.

---

# 16. Final Product Expectations

The final application should deliver two excellent experiences.

### For Students

A simple, fast and transparent process:

Enter Details → Upload Report → View Cost → Check Complete PDF → Confirm → Pay → Receive Confirmation.

### For the Administrator

A centralized workspace where I can:

- View every submitted report.
- Find students quickly.
- Verify payments.
- Check printing costs.
- Download reports.
- Organize bulk printing.
- Track printing progress.
- Maintain accurate records.

### Final Objective

Build a polished, reliable and practical college project report printing management web application specifically for me and my group.

**The most important priorities are:**

1. Excellent UI/UX without generic AI-generated aesthetics.
2. Accurate printing cost calculation.
3. Mandatory complete PDF verification.
4. Reliable payment confirmation.
5. Efficient bulk report management.
6. Simple administration.
7. Secure storage of student details and uploaded reports.
8. Maintainable architecture without unnecessary complexity.

Do not over-engineer the application. Every feature should solve an actual problem in our printing workflow.

The result should feel like a thoughtfully designed, premium product that is genuinely useful in everyday operation.
