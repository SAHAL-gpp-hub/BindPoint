import pytest
import secrets
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
        admin_token = admin_data["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

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
