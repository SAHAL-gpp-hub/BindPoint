from datetime import datetime, timezone
from decimal import Decimal
import secrets
import string
from typing import Optional
from uuid import UUID
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.core.receipt import generate_receipt_pdf
from backend.app.models import Student, Report, ReportVerification, Order, Payment, ActivityLog
from backend.app.schemas import (
    OrderCreateRequest,
    OrderDetailResponse,
    StudentSummary,
    ReportSummary,
    PricingBreakdownSchema,
    PaymentSummary,
    ActivityLogEntry,
)

router = APIRouter(prefix="/orders", tags=["orders"])


def generate_order_id() -> str:
    """Generates unique order ID format PR-YYMMDD-XXXX."""
    date_str = datetime.now(timezone.utc).strftime("%y%m%d")
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(chars) for _ in range(4))
    return f"PR-{date_str}-{suffix}"


def build_upi_deep_link(order_id: str, amount: Decimal) -> str:
    """
    Builds UPI intent deep link:
    upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<amount, 2 decimals>&cu=INR&tn=<order ID>
    (tr omitted deliberately for personal VPAs)
    """
    params = [
        f"pa={quote(settings.UPI_ID)}",
        f"pn={quote(settings.PAYEE_NAME)}",
        f"am={amount:.2f}",
        f"cu=INR",
        f"tn={quote(order_id)}",
    ]
    return f"upi://pay?{'&'.join(params)}"


@router.post("", response_model=OrderDetailResponse)
async def create_order(
    payload: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch Report
    query_report = select(Report).where(Report.id == payload.report_id)
    res_report = await db.execute(query_report)
    report = res_report.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded report not found.",
        )

    # 2. ENFORCE SERVER-SIDE VERIFICATION GATE
    query_ver = select(ReportVerification).where(ReportVerification.report_id == payload.report_id)
    res_ver = await db.execute(query_ver)
    verification = res_ver.scalar_one_or_none()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification required: You must review your complete PDF and confirm it is final before creating an order.",
        )

    if (
        verification.confirmed_hash != report.pdf_hash
        or verification.confirmed_page_count != report.page_count
        or not verification.is_final
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification expired or invalid: The document has been modified since it was verified. Please verify again.",
        )

    # 3. Check if report already belongs to another order
    query_existing_order = select(Order).where(Order.report_id == payload.report_id)
    res_existing_order = await db.execute(query_existing_order)
    if res_existing_order.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An order has already been created for this report.",
        )

    # 4. DUPLICATE CHECK: Enrollment Number
    # At most one active (non-cancelled, non-completed) order per enrollment number
    query_student = select(Student).where(Student.enrollment_number == payload.enrollment_number)
    res_student = await db.execute(query_student)
    student = res_student.scalar_one_or_none()

    if student:
        # Check active orders
        query_active_orders = select(Order).where(
            and_(
                Order.student_id == student.id,
                Order.print_status.notin_(["Cancelled", "Completed"]),
            )
        )
        res_active = await db.execute(query_active_orders)
        active_order = res_active.scalar_one_or_none()
        if active_order:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An active order ({active_order.id}) is already in progress for enrollment number {payload.enrollment_number}. You may track its status or contact the administrator.",
            )

        # Update student name and mobile if changed
        student.full_name = payload.full_name
        student.mobile_number = payload.mobile_number
    else:
        student = Student(
            full_name=payload.full_name,
            enrollment_number=payload.enrollment_number,
            mobile_number=payload.mobile_number,
        )
        db.add(student)
        await db.flush()

    # 5. Generate Collision-Safe Order ID
    for _ in range(10):
        new_order_id = generate_order_id()
        existing = await db.execute(select(Order).where(Order.id == new_order_id))
        if not existing.scalar_one_or_none():
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate unique order ID. Please try again.",
        )

    # 6. Create Order
    order = Order(
        id=new_order_id,
        student_id=student.id,
        report_id=report.id,
        payment_status="Pending",
        print_status="Submitted",
    )
    db.add(order)

    # 7. Create Initial Payment Record
    payment = Payment(
        order_id=new_order_id,
        amount=report.total_amount,
        status="Pending",
    )
    db.add(payment)

    # 8. Activity Log Entry
    log = ActivityLog(
        order_id=new_order_id,
        actor_type="student",
        actor_id=student.enrollment_number,
        from_state=None,
        to_state="Submitted",
        note=f"Order created for {report.page_count} pages. Total payable: ₹{report.total_amount:.2f}.",
    )
    db.add(log)

    await db.commit()

    # Build response
    upi_link = build_upi_deep_link(order.id, report.total_amount)

    return OrderDetailResponse(
        order_id=order.id,
        student=StudentSummary(
            full_name=student.full_name,
            enrollment_number=student.enrollment_number,
            mobile_number=student.mobile_number,
        ),
        report=ReportSummary(
            id=report.id,
            original_filename=report.original_filename,
            file_size=report.file_size,
            page_count=report.page_count,
            pdf_hash=report.pdf_hash,
            breakdown=PricingBreakdownSchema(
                total_pages=report.page_count,
                colour_pages=report.colour_pages,
                normal_sheets=report.normal_sheets,
                special_sheets=report.special_sheets,
                printed_sides=1 + report.colour_pages,
                blank_sides=report.blank_sides,
                special_paper_cost=report.special_paper_cost,
                colour_printing_cost=report.colour_printing_cost,
                total_amount=report.total_amount,
            ),
        ),
        payment_status=order.payment_status,
        print_status=order.print_status,
        upi_id=settings.UPI_ID,
        payee_name=settings.PAYEE_NAME,
        upi_deep_link=upi_link,
        qr_data=upi_link,
        collection_instructions=settings.COLLECTION_INSTRUCTIONS,
        payment=PaymentSummary(
            amount=payment.amount,
            utr_number=payment.utr_number,
            payer_vpa=payment.payer_vpa,
            status=payment.status,
            rejection_reason=payment.rejection_reason,
            screenshot_url=None,
            created_at=payment.created_at,
        ),
        timeline=[
            ActivityLogEntry(
                actor_type=log.actor_type,
                from_state=log.from_state,
                to_state=log.to_state,
                note=log.note,
                created_at=log.created_at,
            )
        ],
        created_at=order.created_at,
        completed_at=order.completed_at,
    )


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order(
    order_id: str,
    mobile: Optional[str] = Query(None, description="Mobile number for student authentication"),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.student),
            selectinload(Order.report),
            selectinload(Order.payments),
            selectinload(Order.activity_logs),
        )
        .where(Order.id == order_id)
    )
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )

    # Privacy verification: if mobile is provided, verify match
    if mobile and order.student.mobile_number != mobile.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The mobile number provided does not match the order records.",
        )

    latest_payment = order.payments[0] if order.payments else None
    upi_link = build_upi_deep_link(order.id, order.report.total_amount)

    screenshot_url = None
    if latest_payment and latest_payment.screenshot_path:
        screenshot_url = f"/api/v1/admin/orders/{order.id}/screenshot"

    return OrderDetailResponse(
        order_id=order.id,
        student=StudentSummary(
            full_name=order.student.full_name,
            enrollment_number=order.student.enrollment_number,
            mobile_number=order.student.mobile_number,
        ),
        report=ReportSummary(
            id=order.report.id,
            original_filename=order.report.original_filename,
            file_size=order.report.file_size,
            page_count=order.report.page_count,
            pdf_hash=order.report.pdf_hash,
            breakdown=PricingBreakdownSchema(
                total_pages=order.report.page_count,
                colour_pages=order.report.colour_pages,
                normal_sheets=order.report.normal_sheets,
                special_sheets=order.report.special_sheets,
                printed_sides=1 + order.report.colour_pages,
                blank_sides=order.report.blank_sides,
                special_paper_cost=order.report.special_paper_cost,
                colour_printing_cost=order.report.colour_printing_cost,
                total_amount=order.report.total_amount,
            ),
        ),
        payment_status=order.payment_status,
        print_status=order.print_status,
        upi_id=settings.UPI_ID,
        payee_name=settings.PAYEE_NAME,
        upi_deep_link=upi_link,
        qr_data=upi_link,
        collection_instructions=settings.COLLECTION_INSTRUCTIONS,
        payment=PaymentSummary(
            amount=latest_payment.amount if latest_payment else order.report.total_amount,
            utr_number=latest_payment.utr_number if latest_payment else None,
            payer_vpa=latest_payment.payer_vpa if latest_payment else None,
            status=latest_payment.status if latest_payment else "Pending",
            rejection_reason=latest_payment.rejection_reason if latest_payment else None,
            screenshot_url=screenshot_url,
            created_at=latest_payment.created_at if latest_payment else order.created_at,
        ) if latest_payment else None,
        timeline=[
            ActivityLogEntry(
                actor_type=log.actor_type,
                from_state=log.from_state,
                to_state=log.to_state,
                note=log.note,
                created_at=log.created_at,
            )
            for log in order.activity_logs
        ],
        created_at=order.created_at,
        completed_at=order.completed_at,
    )


@router.get("/{order_id}/receipt")
async def download_order_receipt(
    order_id: str,
    mobile: Optional[str] = Query(None, description="Mobile number for student authentication"),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.student),
            selectinload(Order.report),
            selectinload(Order.payments),
        )
        .where(Order.id == order_id)
    )
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )

    if mobile and order.student.mobile_number != mobile.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The mobile number provided does not match the order records.",
        )

    receipt_bytes = generate_receipt_pdf(order)
    return Response(
        content=receipt_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Receipt_{order.id}.pdf"},
    )
