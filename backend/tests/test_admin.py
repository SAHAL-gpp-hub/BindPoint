import pytest
import secrets
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from pathlib import Path
from backend.app.main import app
from backend.app.config import settings

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"


def random_enrollment() -> str:
    return "21" + "".join(secrets.choice("0123456789") for _ in range(10))


def random_utr() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(12))


@pytest.mark.asyncio
async def test_admin_flow_and_reused_utr():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an initial order first
        pdf_path = TEST_PDFS_DIR / "report_3p.pdf"
        with open(pdf_path, "rb") as f:
            res_up = await client.post(
                "/api/v1/reports/upload",
                files={"file": ("admin_test_report.pdf", f, "application/pdf")},
            )
        assert res_up.status_code == 200
        rep_id = res_up.json()["report_id"]
        pdf_hash = res_up.json()["pdf_hash"]

        # Verify
        await client.post(
            f"/api/v1/reports/{rep_id}/verify",
            json={"confirmed_hash": pdf_hash, "confirmed_page_count": 3, "is_final": True},
        )

        enrollment_rohan = random_enrollment()
        # Create Order
        res_ord = await client.post(
            "/api/v1/orders",
            json={
                "full_name": "Rohan Sharma",
                "enrollment_number": enrollment_rohan,
                "mobile_number": "9876543211",
                "report_id": rep_id,
            },
        )
        assert res_ord.status_code == 200, res_ord.text
        order_id = res_ord.json()["order_id"]

        utr_rohan = random_utr()
        # Submit UTR
        await client.post(
            f"/api/v1/orders/{order_id}/payment",
            data={"utr_number": utr_rohan, "payer_vpa": "rohan@upi"},
        )

        # 1. Admin login with wrong password -> 401
        res_bad_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": "WrongPassword!"},
        )
        assert res_bad_login.status_code == 401

        # 2. Admin login with correct password -> 200
        res_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
        )
        assert res_login.status_code == 200
        admin_data = res_login.json()
        assert "token" in admin_data
        assert "csrf_token" in admin_data
        admin_token = admin_data["token"]
        csrf_token = admin_data["csrf_token"]
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "X-CSRF-Token": csrf_token,
        }

        # 3. Check me endpoint
        res_me = await client.get("/api/v1/admin/auth/me", headers=headers)
        assert res_me.status_code == 200
        assert res_me.json()["email"] == settings.ADMIN_EMAIL

        # 4. Check dashboard metrics
        res_metrics = await client.get("/api/v1/admin/dashboard/metrics", headers=headers)
        assert res_metrics.status_code == 200
        metrics = res_metrics.json()
        assert metrics["total_submissions"] >= 1

        # 5. List orders
        res_orders = await client.get("/api/v1/admin/orders", headers=headers)
        assert res_orders.status_code == 200
        orders_list = res_orders.json()["items"]
        assert len(orders_list) >= 1

        # 6. Admin confirms payment
        res_confirm = await client.post(
            f"/api/v1/admin/orders/{order_id}/payment/confirm",
            headers=headers,
            json={"received_amount": float(res_ord.json()["report"]["breakdown"]["total_amount"])},
        )
        assert res_confirm.status_code == 200
        assert res_confirm.json()["status"] == "success"

        # Verify order is now Successful and Ready for Printing
        res_detail = await client.get(f"/api/v1/admin/orders/{order_id}", headers=headers)
        detail = res_detail.json()
        assert detail["payment_status"] == "Successful"
        assert detail["print_status"] == "Ready for Printing"

        # 7. Test Duplicate UTR: Create second order with different student, try to submit SAME UTR
        pdf_path2 = TEST_PDFS_DIR / "report_2p.pdf"
        with open(pdf_path2, "rb") as f:
            res_up2 = await client.post(
                "/api/v1/reports/upload",
                files={"file": ("student2_report.pdf", f, "application/pdf")},
            )
        rep_id2 = res_up2.json()["report_id"]
        await client.post(
            f"/api/v1/reports/{rep_id2}/verify",
            json={
                "confirmed_hash": res_up2.json()["pdf_hash"],
                "confirmed_page_count": 2,
                "is_final": True,
            },
        )
        enrollment_diya = random_enrollment()
        res_ord2 = await client.post(
            "/api/v1/orders",
            json={
                "full_name": "Diya Shah",
                "enrollment_number": enrollment_diya,
                "mobile_number": "9123456780",
                "report_id": rep_id2,
            },
        )
        ord2_id = res_ord2.json()["order_id"]

        # Submit same UTR rohan used -> MUST BE REJECTED WITH 409 CONFLICT
        res_dup_utr = await client.post(
            f"/api/v1/orders/{ord2_id}/payment",
            data={"utr_number": utr_rohan},
        )
        assert res_dup_utr.status_code == 409
        assert "already been submitted" in res_dup_utr.json()["detail"]

        # Submit new unique UTR for ord2
        utr_diya = random_utr()
        res_ok_utr = await client.post(
            f"/api/v1/orders/{ord2_id}/payment",
            data={"utr_number": utr_diya},
        )
        assert res_ok_utr.status_code == 200

        # Admin rejects ord2 payment with reason
        res_reject = await client.post(
            f"/api/v1/admin/orders/{ord2_id}/payment/reject",
            headers=headers,
            json={"reason": "UTR not received in bank statement. Please verify and re-enter."},
        )
        assert res_reject.status_code == 200
        assert res_reject.json()["status"] == "rejected"

        # Check student sees the rejection
        res_check_ord2 = await client.get(f"/api/v1/orders/{ord2_id}")
        assert res_check_ord2.json()["payment_status"] == "Pending"
        assert res_check_ord2.json()["payment"]["rejection_reason"] == "UTR not received in bank statement. Please verify and re-enter."

        # 8. CSV export test
        res_csv = await client.get("/api/v1/admin/export/csv", headers=headers)
        assert res_csv.status_code == 200
        assert "Order ID,Student Name" in res_csv.text

        # 9. XLSX export test
        res_xlsx = await client.get("/api/v1/admin/export/xlsx", headers=headers)
        assert res_xlsx.status_code == 200
        assert len(res_xlsx.content) > 500

        # 10. Batch ZIP export test
        res_zip = await client.post(
            "/api/v1/admin/batches/export-zip",
            headers=headers,
            json={"order_ids": [order_id, ord2_id]},
        )
        assert res_zip.status_code == 200
        assert res_zip.headers["content-type"] == "application/zip"
        assert len(res_zip.content) > 500


@pytest.mark.asyncio
async def test_admin_csrf_protection_and_state_changing_rejection():
    """Confirms CSRF rejection on state-changing admin endpoints when X-CSRF-Token is missing or invalid."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login to obtain session cookie
        res_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
        )
        assert res_login.status_code == 200
        csrf_token = res_login.json()["csrf_token"]

        # Attempt state-changing POST without X-CSRF-Token header -> MUST BE 403
        res_no_csrf = await client.post(
            "/api/v1/admin/orders/PR-260101-NONE/payment/confirm",
            json={"received_amount": 25.0},
        )
        assert res_no_csrf.status_code == 403
        assert "CSRF validation failed" in res_no_csrf.json()["detail"]

        # Attempt state-changing PATCH without X-CSRF-Token header -> MUST BE 403
        res_no_csrf_patch = await client.patch(
            "/api/v1/admin/orders/PR-260101-NONE/print-status",
            json={"print_status": "Printing"},
        )
        assert res_no_csrf_patch.status_code == 403

        # Attempt state-changing POST with invalid X-CSRF-Token header -> MUST BE 403
        res_bad_csrf = await client.post(
            "/api/v1/admin/orders/PR-260101-NONE/payment/confirm",
            headers={"X-CSRF-Token": "invalid_forged_token"},
            json={"received_amount": 25.0},
        )
        assert res_bad_csrf.status_code == 403

        # Attempt state-changing POST with correct X-CSRF-Token header -> proceeds to business logic (404 for nonexistent order)
        res_valid_csrf = await client.post(
            "/api/v1/admin/orders/PR-260101-NONE/payment/confirm",
            headers={"X-CSRF-Token": csrf_token},
            json={"received_amount": 25.0},
        )
        assert res_valid_csrf.status_code == 404  # Reached endpoint logic safely


@pytest.mark.asyncio
async def test_unauthenticated_admin_and_file_routes():
    """Confirms that unauthenticated requests to admin endpoints and file routes return 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Metrics
        res = await client.get("/api/v1/admin/dashboard/metrics")
        assert res.status_code == 401

        # Orders list
        res = await client.get("/api/v1/admin/orders")
        assert res.status_code == 401

        # Order detail
        res = await client.get("/api/v1/admin/orders/PR-260101-TEST")
        assert res.status_code == 401

        # PDF file route
        res = await client.get("/api/v1/admin/orders/PR-260101-TEST/pdf")
        assert res.status_code == 401

        # Receipt route
        res = await client.get("/api/v1/admin/orders/PR-260101-TEST/receipt")
        assert res.status_code == 401

        # Screenshot file route
        res = await client.get("/api/v1/admin/orders/PR-260101-TEST/screenshot")
        assert res.status_code == 401

        # Batches list
        res = await client.get("/api/v1/admin/batches")
        assert res.status_code == 401

        # CSV / XLSX export
        res = await client.get("/api/v1/admin/export/csv")
        assert res.status_code == 401
        res = await client.get("/api/v1/admin/export/xlsx")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_admin_orders_submission_date_filter():
    """Confirms filtering orders by submission date range (date_from and date_to)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
        )
        token = res_login.json()["token"]
        csrf = res_login.json()["csrf_token"]
        headers = {"Authorization": f"Bearer {token}", "X-CSRF-Token": csrf}

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        past_str = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d")
        future_str = (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d")

        # Range including today
        res = await client.get(f"/api/v1/admin/orders?date_from={past_str}&date_to={future_str}", headers=headers)
        assert res.status_code == 200
        assert "items" in res.json()

        # Far past date range returning 0 items
        old_from = "2020-01-01"
        old_to = "2020-01-02"
        res_old = await client.get(f"/api/v1/admin/orders?date_from={old_from}&date_to={old_to}", headers=headers)
        assert res_old.status_code == 200
        assert res_old.json()["total"] == 0
        assert len(res_old.json()["items"]) == 0


@pytest.mark.asyncio
async def test_batches_progress_sorting_and_completion_tickoff():
    """Confirms print batches creation, listing, sorting, progress percentage, and per-report tick-off."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
        )
        token = res_login.json()["token"]
        csrf = res_login.json()["csrf_token"]
        headers = {"Authorization": f"Bearer {token}", "X-CSRF-Token": csrf}

        # Create two verified orders
        pdf_path = TEST_PDFS_DIR / "report_2p.pdf"
        with open(pdf_path, "rb") as f:
            up1 = await client.post("/api/v1/reports/upload", files={"file": ("batch_test_1.pdf", f, "application/pdf")})
        rep1_id = up1.json()["report_id"]
        await client.post(f"/api/v1/reports/{rep1_id}/verify", json={"confirmed_hash": up1.json()["pdf_hash"], "confirmed_page_count": 2, "is_final": True})
        
        ord1_res = await client.post("/api/v1/orders", json={
            "full_name": "Aarav Patel",
            "enrollment_number": random_enrollment(),
            "mobile_number": "9811111111",
            "report_id": rep1_id,
        })
        ord1_id = ord1_res.json()["order_id"]

        with open(pdf_path, "rb") as f:
            up2 = await client.post("/api/v1/reports/upload", files={"file": ("batch_test_2.pdf", f, "application/pdf")})
        rep2_id = up2.json()["report_id"]
        await client.post(f"/api/v1/reports/{rep2_id}/verify", json={"confirmed_hash": up2.json()["pdf_hash"], "confirmed_page_count": 2, "is_final": True})
        
        ord2_res = await client.post("/api/v1/orders", json={
            "full_name": "Zara Khan",
            "enrollment_number": random_enrollment(),
            "mobile_number": "9822222222",
            "report_id": rep2_id,
        })
        ord2_id = ord2_res.json()["order_id"]

        # Create Batch
        res_create_batch = await client.post(
            "/api/v1/admin/batches",
            headers=headers,
            json={"order_ids": [ord1_id, ord2_id], "batch_name": "Test QA Batch"},
        )
        assert res_create_batch.status_code == 200
        batch_id = res_create_batch.json()["batch_id"]

        # 1. List Batches and check progress bar (initially 0%)
        res_batches = await client.get("/api/v1/admin/batches", headers=headers)
        assert res_batches.status_code == 200
        b_list = res_batches.json()["batches"]
        matching_b = next((b for b in b_list if b["id"] == batch_id), None)
        assert matching_b is not None
        assert matching_b["total_reports"] == 2
        assert matching_b["completed_reports"] == 0
        assert matching_b["progress_percent"] == 0.0

        # 2. Get Batch detail sorted by enrollment
        res_detail = await client.get(f"/api/v1/admin/batches/{batch_id}?sort_by=enrollment", headers=headers)
        assert res_detail.status_code == 200
        orders_in_batch = res_detail.json()["orders"]
        assert len(orders_in_batch) == 2

        # 3. Get Batch detail sorted by submission_time
        res_detail_time = await client.get(f"/api/v1/admin/batches/{batch_id}?sort_by=submission_time", headers=headers)
        assert res_detail_time.status_code == 200

        # 4. Tick-off report 1 as Completed
        res_tick = await client.post(
            f"/api/v1/admin/batches/{batch_id}/orders/{ord1_id}/toggle-complete",
            headers=headers,
        )
        assert res_tick.status_code == 200
        assert res_tick.json()["print_status"] == "Completed"
        assert res_tick.json()["completed_reports"] == 1
        assert res_tick.json()["progress_percent"] == 50.0

        # 5. Tick-off report 2 as Completed -> Progress reaches 100%
        res_tick2 = await client.post(
            f"/api/v1/admin/batches/{batch_id}/orders/{ord2_id}/toggle-complete",
            headers=headers,
        )
        assert res_tick2.status_code == 200
        assert res_tick2.json()["completed_reports"] == 2
        assert res_tick2.json()["progress_percent"] == 100.0


@pytest.mark.asyncio
async def test_receipt_pdf_generation_endpoints():
    """Confirms student and admin receipt PDF generation and valid PDF magic bytes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an order
        pdf_path = TEST_PDFS_DIR / "report_2p.pdf"
        with open(pdf_path, "rb") as f:
            up = await client.post("/api/v1/reports/upload", files={"file": ("receipt_test.pdf", f, "application/pdf")})
        assert up.status_code == 200
        rep_id = up.json()["report_id"]
        await client.post(f"/api/v1/reports/{rep_id}/verify", json={"confirmed_hash": up.json()["pdf_hash"], "confirmed_page_count": 2, "is_final": True})
        
        enrollment = random_enrollment()
        ord_res = await client.post("/api/v1/orders", json={
            "full_name": "Receipt Student",
            "enrollment_number": enrollment,
            "mobile_number": "9800000001",
            "report_id": rep_id,
        })
        order_id = ord_res.json()["order_id"]

        # Student receipt endpoint
        res_student_receipt = await client.get(f"/api/v1/orders/{order_id}/receipt")
        assert res_student_receipt.status_code == 200
        assert res_student_receipt.headers["content-type"] == "application/pdf"
        assert res_student_receipt.content.startswith(b"%PDF-")

        # Admin login and admin receipt endpoint
        res_login = await client.post(
            "/api/v1/admin/auth/login",
            json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
        )
        headers = {"Authorization": f"Bearer {res_login.json()['token']}"}
        res_admin_receipt = await client.get(f"/api/v1/admin/orders/{order_id}/receipt", headers=headers)
        assert res_admin_receipt.status_code == 200
        assert res_admin_receipt.headers["content-type"] == "application/pdf"
        assert res_admin_receipt.content.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_admin_login_rate_limiting():
    """Confirms that rate limiting triggers after exceeding the allowed requests threshold."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 5 allowed attempts, 6th should return 429
        statuses = []
        for i in range(7):
            res = await client.post(
                "/api/v1/admin/auth/login",
                json={"email": settings.ADMIN_EMAIL, "password": "WrongPasswordAttempt"},
            )
            statuses.append(res.status_code)
        
        # At least one of the requests beyond limit must be 429 Too Many Requests
        assert 429 in statuses, f"Expected 429 in statuses, got {statuses}"
