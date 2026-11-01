"""
Demo seed script for College Project Report Printing Management Web App.
Seeds sample students, uploaded reports, orders in various lifecycle stages,
UTR payment submissions, activity logs, and a sample print batch.
"""

import asyncio
import os
import shutil
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.config import settings
from backend.app.database import AsyncSessionLocal, engine
from backend.app.init_db import init_db
from backend.app.models import Admin, Student, Report, ReportVerification, Order, Payment, PrintBatch, ActivityLog
from backend.app.core.pricing import calculate_printing_cost

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
TEST_PDFS_DIR = STORAGE_DIR / "test_pdfs"
UPLOADS_DIR = settings.uploads_path


DEMO_STUDENTS = [
    {
        "name": "Aarav Sharma",
        "enrollment": "21BCE1001",
        "mobile": "9876543210",
        "pdf_name": "report_10p.pdf",
        "pages": 10,
        "pay_status": "Successful",
        "print_status": "Completed",
        "utr": "100112345678",
        "in_batch": True,
        "batch_done": True,
    },
    {
        "name": "Diya Patel",
        "enrollment": "21BCE1002",
        "mobile": "9876543211",
        "pdf_name": "report_20p.pdf",
        "pages": 20,
        "pay_status": "Successful",
        "print_status": "Printing",
        "utr": "100212345678",
        "in_batch": True,
        "batch_done": False,
    },
    {
        "name": "Rohan Gupta",
        "enrollment": "21BCE1003",
        "mobile": "9876543212",
        "pdf_name": "report_3p.pdf",
        "pages": 3,
        "pay_status": "Successful",
        "print_status": "Ready for Printing",
        "utr": "100312345678",
        "in_batch": False,
        "batch_done": False,
    },
    {
        "name": "Ananya Iyer",
        "enrollment": "21BCE1004",
        "mobile": "9876543213",
        "pdf_name": "report_11p.pdf",
        "pages": 11,
        "pay_status": "Successful",
        "print_status": "Ready for Printing",
        "utr": "100412345678",
        "in_batch": False,
        "batch_done": False,
    },
    {
        "name": "Vikram Singh",
        "enrollment": "21BCE1005",
        "mobile": "9876543214",
        "pdf_name": "report_2p.pdf",
        "pages": 2,
        "pay_status": "Verification Required",
        "print_status": "Submitted",
        "utr": "100512345678",
        "in_batch": False,
        "batch_done": False,
    },
    {
        "name": "Sneha Reddy",
        "enrollment": "21BCE1006",
        "mobile": "9876543215",
        "pdf_name": "report_21p.pdf",
        "pages": 21,
        "pay_status": "Verification Required",
        "print_status": "Submitted",
        "utr": "100612345678",
        "in_batch": False,
        "batch_done": False,
    },
    {
        "name": "Kabir Mehta",
        "enrollment": "21BCE1007",
        "mobile": "9876543216",
        "pdf_name": "report_50p.pdf",
        "pages": 50,
        "pay_status": "Pending",
        "print_status": "Submitted",
        "utr": None,
        "in_batch": False,
        "batch_done": False,
    },
]


async def seed():
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check admin
        admin_res = await db.execute(select(Admin).where(Admin.email == settings.ADMIN_EMAIL.lower()))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            raise RuntimeError("Admin not found after init_db.")

        print(f"Admin verified: {admin.email}")

        # Check existing orders to avoid duplicate seeds
        existing_orders_res = await db.execute(select(Order))
        existing_count = len(existing_orders_res.scalars().all())
        if existing_count > 0:
            print(f"Database already contains {existing_count} order(s). Proceeding with supplemental demo seeds...")

        now = datetime.now(timezone.utc)
        batch_orders = []

        for i, s in enumerate(DEMO_STUDENTS):
            # Source PDF
            source_pdf = TEST_PDFS_DIR / s["pdf_name"]
            if not source_pdf.exists():
                print(f"Warning: {source_pdf} not found. Skipping.")
                continue

            stored_name = f"{uuid.uuid4().hex}.pdf"
            dest_pdf = UPLOADS_DIR / stored_name
            shutil.copyfile(source_pdf, dest_pdf)

            # Compute pricing
            pricing = calculate_printing_cost(s["pages"])

            # Check or create student
            student_res = await db.execute(select(Student).where(Student.enrollment_number == s["enrollment"]))
            student = student_res.scalar_one_or_none()
            if not student:
                student = Student(
                    full_name=s["name"],
                    enrollment_number=s["enrollment"],
                    mobile_number=s["mobile"],
                )
                db.add(student)
                await db.flush()

            # Create report
            report = Report(
                original_filename=f"{s['name'].replace(' ', '_')}_Final_Report.pdf",
                stored_filename=stored_name,
                file_size=dest_pdf.stat().st_size,
                page_count=s["pages"],
                pdf_hash=f"hash_{uuid.uuid4().hex[:16]}",
                normal_sheets=pricing.normal_sheets,
                special_sheets=pricing.special_sheets,
                colour_pages=pricing.colour_pages,
                blank_sides=pricing.blank_sides,
                special_paper_cost=pricing.special_paper_cost,
                colour_printing_cost=pricing.colour_printing_cost,
                total_amount=pricing.total_amount,
            )
            db.add(report)
            await db.flush()

            # Create verification
            ver = ReportVerification(
                report_id=report.id,
                confirmed_hash=report.pdf_hash,
                confirmed_page_count=report.page_count,
                is_final=True,
            )
            db.add(ver)

            # Create Order
            date_offset = timedelta(minutes=(i * 15))
            order_time = now - timedelta(hours=2) + date_offset
            order_id = f"PR-{order_time.strftime('%y%m%d')}-{1000 + i}"

            # Check if order already exists
            existing_ord = await db.execute(select(Order).where(Order.id == order_id))
            if existing_ord.scalar_one_or_none():
                continue

            order = Order(
                id=order_id,
                student_id=student.id,
                report_id=report.id,
                payment_status=s["pay_status"],
                print_status=s["print_status"],
                created_at=order_time,
                completed_at=order_time + timedelta(minutes=45) if s["print_status"] == "Completed" else None,
            )
            db.add(order)
            await db.flush()

            # Create Payment
            payment = Payment(
                order_id=order.id,
                amount=pricing.total_amount,
                utr_number=s["utr"],
                payer_vpa=f"{s['enrollment'].lower()}@upi" if s["utr"] else None,
                status=s["pay_status"] if s["pay_status"] != "Verification Required" else "Pending",
                confirmed_by=admin.id if s["pay_status"] == "Successful" else None,
                confirmed_at=order_time + timedelta(minutes=10) if s["pay_status"] == "Successful" else None,
                created_at=order_time + timedelta(minutes=5),
            )
            db.add(payment)

            # Activity Logs
            db.add(ActivityLog(
                order_id=order.id,
                actor_type="student",
                actor_id=student.enrollment_number,
                from_state=None,
                to_state="Submitted",
                note=f"Submitted report ({report.page_count} pages). Total amount: ₹{report.total_amount:.2f}.",
                created_at=order_time,
            ))

            if s["utr"]:
                db.add(ActivityLog(
                    order_id=order.id,
                    actor_type="student",
                    actor_id=student.enrollment_number,
                    from_state="Pending",
                    to_state=s["pay_status"],
                    note=f"Submitted 12-digit transaction UTR: {s['utr']}",
                    created_at=order_time + timedelta(minutes=5),
                ))

            if s["pay_status"] == "Successful":
                db.add(ActivityLog(
                    order_id=order.id,
                    actor_type="admin",
                    actor_id=admin.email,
                    from_state="Verification Required",
                    to_state="Successful",
                    note=f"Admin {admin.email} verified payment of ₹{report.total_amount:.2f}.",
                    created_at=order_time + timedelta(minutes=10),
                ))

            if s["print_status"] == "Completed":
                db.add(ActivityLog(
                    order_id=order.id,
                    actor_type="admin",
                    actor_id=admin.email,
                    from_state="Printing",
                    to_state="Completed",
                    note="Physical printing and duplex binding completed. Ready for counter pickup.",
                    created_at=order_time + timedelta(minutes=45),
                ))

            if s["in_batch"]:
                batch_orders.append((order, report, s["batch_done"]))

        # Create Demo Batch if orders available
        if batch_orders:
            batch_name = "Morning Batch 01 (CS Dept)"
            total_pages = sum(r.page_count for _, r, _ in batch_orders)
            total_sheets = sum(r.normal_sheets + r.special_sheets for _, r, _ in batch_orders)
            batch = PrintBatch(
                batch_name=batch_name,
                created_by=admin.id,
                total_reports=len(batch_orders),
                total_pages=total_pages,
                total_sheets=total_sheets,
            )
            db.add(batch)
            await db.flush()

            for ord_obj, _, done in batch_orders:
                ord_obj.batch_id = batch.id
                if done:
                    ord_obj.print_status = "Completed"
                else:
                    ord_obj.print_status = "Printing"

        await db.commit()

    await engine.dispose()
    print("Demo dataset seeded successfully!")
    print("\nAdmin Credentials:")
    print(f"Email:    {settings.ADMIN_EMAIL}")
    print(f"Password: {settings.ADMIN_PASSWORD}")
    print("\nTest student enrollment numbers seeded:")
    for s in DEMO_STUDENTS:
        print(f" - {s['enrollment']}: {s['name']} ({s['pay_status']} / {s['print_status']})")


if __name__ == "__main__":
    asyncio.run(seed())
