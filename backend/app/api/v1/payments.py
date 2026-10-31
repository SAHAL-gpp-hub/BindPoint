import os
import re
import uuid
import shutil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import Order, Payment, ActivityLog
from backend.app.schemas import OrderDetailResponse
from backend.app.api.v1.orders import build_upi_deep_link
from backend.app.schemas import (
    StudentSummary,
    ReportSummary,
    PricingBreakdownSchema,
    PaymentSummary,
    ActivityLogEntry,
)

router = APIRouter(prefix="/orders", tags=["payments"])

UTR_REGEX = re.compile(r"^\d{12}$")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/{order_id}/payment", response_model=OrderDetailResponse)
async def submit_payment(
    order_id: str,
    utr_number: str = Form(..., description="12-digit transaction UTR"),
    payer_vpa: Optional[str] = Form(None),
    screenshot: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    clean_utr = utr_number.strip()
    if not UTR_REGEX.match(clean_utr):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction UTR must be exactly 12 numeric digits (from your UPI receipt).",
        )

    # 1. Fetch Order with relationships
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

    if order.payment_status == "Successful":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has already been verified and marked as paid.",
        )

    # 2. Check for Duplicate UTR across all orders
    query_utr = select(Payment).where(
        and_(
            Payment.utr_number == clean_utr,
            Payment.order_id != order_id,
        )
    )
    res_utr = await db.execute(query_utr)
    duplicate_payment = res_utr.scalar_one_or_none()

    if duplicate_payment:
        # Flag and record duplicate attempt
        log = ActivityLog(
            order_id=order.id,
            actor_type="student",
            actor_id=order.student.enrollment_number,
            from_state=order.payment_status,
            to_state="Verification Required (Blocked)",
            note=f"Security alert: Duplicate UTR {clean_utr} submission attempted. Matches order {duplicate_payment.order_id}.",
        )
        db.add(log)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This 12-digit UTR ({clean_utr}) has already been submitted for another order. Each transaction reference must be unique.",
        )

    # 3. Handle optional screenshot upload
    screenshot_filename = None
    if screenshot and screenshot.filename:
        if screenshot.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment screenshot must be an image file (JPEG, PNG, or WebP).",
            )
        
        ext = os.path.splitext(screenshot.filename)[1].lower() or ".png"
        screenshot_filename = f"{uuid.uuid4().hex}{ext}"
        screenshot_path = settings.screenshots_path / screenshot_filename

        try:
            with open(screenshot_path, "wb") as buffer:
                shutil.copyfileobj(screenshot.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not store payment screenshot: {str(e)}",
            )

    # 4. Update or create Payment record
    payment = order.payments[0] if order.payments else None
    if not payment:
        payment = Payment(
            order_id=order.id,
            amount=order.report.total_amount,
        )
        db.add(payment)

    from_payment_status = order.payment_status
    payment.utr_number = clean_utr
    payment.payer_vpa = payer_vpa.strip() if payer_vpa else None
    if screenshot_filename:
        payment.screenshot_path = screenshot_filename
    payment.status = "Verification Required"
    payment.rejection_reason = None  # Clear any previous rejection reason

    # 5. Update Order status
    order.payment_status = "Verification Required"

    # 6. Log activity
    log = ActivityLog(
        order_id=order.id,
        actor_type="student",
        actor_id=order.student.enrollment_number,
        from_state=from_payment_status,
        to_state="Verification Required",
        note=f"Student submitted 12-digit UTR: {clean_utr}. Payer VPA: {payer_vpa or 'Not specified'}.",
    )
    db.add(log)

    await db.commit()
    await db.refresh(order)

    upi_link = build_upi_deep_link(order.id, order.report.total_amount)
    screenshot_url = f"/api/v1/admin/orders/{order.id}/screenshot" if payment.screenshot_path else None

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
            amount=payment.amount,
            utr_number=payment.utr_number,
            payer_vpa=payment.payer_vpa,
            status=payment.status,
            rejection_reason=payment.rejection_reason,
            screenshot_url=screenshot_url,
            created_at=payment.created_at,
        ),
        timeline=[
            ActivityLogEntry(
                actor_type=item.actor_type,
                from_state=item.from_state,
                to_state=item.to_state,
                note=item.note,
                created_at=item.created_at,
            )
            for item in order.activity_logs
        ],
        created_at=order.created_at,
        completed_at=order.completed_at,
    )
