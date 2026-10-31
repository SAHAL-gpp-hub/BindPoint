import pytest
import secrets
from httpx import AsyncClient, ASGITransport
from pathlib import Path
from backend.app.main import app

TEST_PDFS_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "test_pdfs"


def random_enrollment() -> str:
    return "21" + "".join(secrets.choice("0123456789") for _ in range(10))


def random_utr() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(12))


@pytest.mark.asyncio
async def test_full_student_order_flow_and_verification_gate():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        enrollment_1 = random_enrollment()
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200

        # 2. Upload valid 10-page report
        pdf_path = TEST_PDFS_DIR / "report_10p.pdf"
        with open(pdf_path, "rb") as f:
            res_upload = await client.post(
                "/api/v1/reports/upload",
                files={"file": ("my_project_report.pdf", f, "application/pdf")},
            )
        assert res_upload.status_code == 200, res_upload.text
        data = res_upload.json()
        report_id = data["report_id"]
        pdf_hash = data["pdf_hash"]
        page_count = data["page_count"]
        breakdown = data["breakdown"]

        # 10 pages -> ₹65.00
        assert page_count == 10
        assert breakdown["colour_pages"] == 9
        assert breakdown["normal_sheets"] == 5
        assert breakdown["blank_sides"] == 1
        assert breakdown["special_paper_cost"] == "20.00"
        assert breakdown["colour_printing_cost"] == "45.00"
        assert breakdown["total_amount"] == "65.00"

        # 3. VERIFICATION GATE TEST: Try creating order WITHOUT verification -> MUST FAIL (400)
        res_fail_order = await client.post(
            "/api/v1/orders",
            json={
                "full_name": "Aarav Patel",
                "enrollment_number": enrollment_1,
                "mobile_number": "9876543210",
                "report_id": report_id,
            },
        )
        assert res_fail_order.status_code == 400
        assert "Verification required" in res_fail_order.json()["detail"]

        # 4. Try verifying with wrong hash -> MUST FAIL (400)
        res_bad_hash = await client.post(
            f"/api/v1/reports/{report_id}/verify",
            json={
                "confirmed_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "confirmed_page_count": 10,
                "is_final": True,
            },
        )
        assert res_bad_hash.status_code == 400

        # 5. Verify correctly ("My PDF is final")
        res_verify = await client.post(
            f"/api/v1/reports/{report_id}/verify",
            json={
                "confirmed_hash": pdf_hash,
                "confirmed_page_count": page_count,
                "is_final": True,
            },
        )
        assert res_verify.status_code == 200
        assert res_verify.json()["status"] == "verified"

        # 6. Create order successfully
        res_order = await client.post(
            "/api/v1/orders",
            json={
                "full_name": "Aarav Patel",
                "enrollment_number": enrollment_1,
                "mobile_number": "9876543210",
                "report_id": report_id,
            },
        )
        assert res_order.status_code == 200, res_order.text
        order_data = res_order.json()
        order_id = order_data["order_id"]
        assert order_data["payment_status"] == "Pending"
        assert order_data["print_status"] == "Submitted"
        assert "upi://pay" in order_data["upi_deep_link"]
        assert "cu=INR" in order_data["upi_deep_link"]
        assert order_id in order_data["upi_deep_link"]

        # 7. DUPLICATE CHECK: Try creating another active order with same enrollment -> MUST FAIL (409)
        with open(pdf_path, "rb") as f:
            res_upload2 = await client.post(
                "/api/v1/reports/upload",
                files={"file": ("another_report.pdf", f, "application/pdf")},
            )
        rep2_id = res_upload2.json()["report_id"]
        await client.post(
            f"/api/v1/reports/{rep2_id}/verify",
            json={
                "confirmed_hash": res_upload2.json()["pdf_hash"],
                "confirmed_page_count": 10,
                "is_final": True,
            },
        )
        res_dup_enroll = await client.post(
            "/api/v1/orders",
            json={
                "full_name": "Aarav Patel",
                "enrollment_number": enrollment_1,
                "mobile_number": "9876543210",
                "report_id": rep2_id,
            },
        )
        assert res_dup_enroll.status_code == 409
        assert "already in progress" in res_dup_enroll.json()["detail"]

        # 8. Submit payment with invalid (short) UTR -> MUST FAIL (400)
        res_bad_utr = await client.post(
            f"/api/v1/orders/{order_id}/payment",
            data={"utr_number": "12345"},
        )
        assert res_bad_utr.status_code == 400

        # 9. Submit valid 12-digit UTR
        test_utr = random_utr()
        res_pay = await client.post(
            f"/api/v1/orders/{order_id}/payment",
            data={
                "utr_number": test_utr,
                "payer_vpa": "aarav@oksbi",
            },
        )
        assert res_pay.status_code == 200, res_pay.text
        updated_order = res_pay.json()
        assert updated_order["payment_status"] == "Verification Required"
        assert updated_order["payment"]["utr_number"] == test_utr

        # 10. Check that order is NOT yet marked paid from student side
        assert updated_order["payment_status"] != "Successful"
