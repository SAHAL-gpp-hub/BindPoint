import csv
import io
import re
import zipfile
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.api.deps import get_current_admin
from backend.app.api.v1.orders import build_upi_deep_link
from backend.app.config import settings
from backend.app.core.security import (
    create_signed_token,
    verify_password,
)
from backend.app.database import get_db
from backend.app.models import ActivityLog, Admin, Order, Payment, PrintBatch, Report, Student
from backend.app.schemas import (
    ActivityLogEntry,
    AdminConfirmPaymentRequest,
    AdminLoginRequest,
    AdminRejectPaymentRequest,
    AdminUpdatePrintStatusRequest,
    BatchCreateRequest,
    DashboardMetricsResponse,
    OrderDetailResponse,
    PaymentSummary,
    PricingBreakdownSchema,
    ReportSummary,
    StudentSummary,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def sanitize_filename_part(text: str) -> str:
    """Sanitizes student names or enrollment numbers for safe ZIP filenames."""
    clean = re.sub(r"[^\w\s-]", "", text).strip()
    return re.sub(r"[-\s]+", "_", clean)


@router.post("/auth/login")
async def admin_login(
    payload: AdminLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    query = select(Admin).where(Admin.email == payload.email.strip().lower())
    result = await db.execute(query)
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Session token valid for 7 days
    token = create_signed_token(
        {"admin_id": str(admin.id), "email": admin.email, "role": "admin"},
        expires_in_seconds=604800,
    )

    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=604800,
    )

    return {
        "status": "success",
        "admin": {"id": str(admin.id), "email": admin.email},
        "token": token,
    }


@router.post("/auth/logout")
async def admin_logout(response: Response):
    response.delete_cookie(key="admin_session")
    return {"status": "logged_out"}


@router.get("/auth/me")
async def admin_me(admin: Admin = Depends(get_current_admin)):
    return {
        "id": str(admin.id),
        "email": admin.email,
        "created_at": admin.created_at,
    }


@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Total submissions
    tot_orders_res = await db.execute(select(func.count(Order.id)))
    total_submissions = tot_orders_res.scalar() or 0

    # Total reports
    tot_reports_res = await db.execute(select(func.count(Report.id)))
    total_reports = tot_reports_res.scalar() or 0

    # Status counts
    pending_pay_res = await db.execute(
        select(func.count(Order.id)).where(Order.payment_status == "Pending")
    )
    pending_payments = pending_pay_res.scalar() or 0

    verif_req_res = await db.execute(
        select(func.count(Order.id)).where(Order.payment_status == "Verification Required")
    )
    verification_required_payments = verif_req_res.scalar() or 0

    conf_pay_res = await db.execute(
        select(func.count(Order.id)).where(Order.payment_status == "Successful")
    )
    confirmed_payments = conf_pay_res.scalar() or 0

    ready_print_res = await db.execute(
        select(func.count(Order.id)).where(Order.print_status == "Ready for Printing")
    )
    ready_for_printing = ready_print_res.scalar() or 0

    printing_res = await db.execute(
        select(func.count(Order.id)).where(Order.print_status == "Printing")
    )
    currently_printing = printing_res.scalar() or 0

    completed_res = await db.execute(
        select(func.count(Order.id)).where(Order.print_status == "Completed")
    )
    completed_reports = completed_res.scalar() or 0

    # Confirmed Revenue
    rev_res = await db.execute(
        select(func.sum(Report.total_amount))
        .join(Order, Order.report_id == Report.id)
        .where(Order.payment_status == "Successful")
    )
    total_revenue = rev_res.scalar() or Decimal("0.00")

    return DashboardMetricsResponse(
        total_submissions=total_submissions,
        total_reports_received=total_reports,
        pending_payments=pending_payments,
        verification_required_payments=verification_required_payments,
        confirmed_payments=confirmed_payments,
        ready_for_printing=ready_for_printing,
        currently_printing=currently_printing,
        completed_reports=completed_reports,
        total_confirmed_revenue=Decimal(total_revenue),
    )


@router.get("/orders")
async def list_orders(
    q: Optional[str] = Query(None, description="Search name, enrollment, order ID, UTR"),
    payment_status: Optional[str] = Query(None),
    print_status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .join(Order.student)
        .join(Order.report)
        .outerjoin(Order.payments)
        .options(
            selectinload(Order.student),
            selectinload(Order.report),
            selectinload(Order.payments),
        )
    )

    conditions = []
    if payment_status:
        conditions.append(Order.payment_status == payment_status)
    if print_status:
        conditions.append(Order.print_status == print_status)

    if q:
        term = f"%{q.strip()}%"
        conditions.append(
            or_(
                Order.id.ilike(term),
                Student.full_name.ilike(term),
                Student.enrollment_number.ilike(term),
                Student.mobile_number.ilike(term),
                Payment.utr_number.ilike(term),
            )
        )

    if conditions:
        query = query.where(and_(*conditions))

    # Total count query
    count_query = (
        select(func.count(func.distinct(Order.id)))
        .select_from(Order)
        .join(Order.student)
        .join(Order.report)
        .outerjoin(Order.payments)
    )
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar() or 0

    # Sorting
    if sort_by == "enrollment":
        order_col = Student.enrollment_number
    elif sort_by == "name":
        order_col = Student.full_name
    elif sort_by == "amount":
        order_col = Report.total_amount
    else:
        order_col = Order.created_at

    query = query.order_by(desc(order_col) if order_dir.lower() == "desc" else order_col)
    query = query.distinct().offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    orders = result.scalars().all()

    items = []
    for o in orders:
        latest_payment = o.payments[0] if o.payments else None
        items.append({
            "order_id": o.id,
            "student_name": o.student.full_name,
            "enrollment_number": o.student.enrollment_number,
            "mobile_number": o.student.mobile_number,
            "original_filename": o.report.original_filename,
            "page_count": o.report.page_count,
            "total_amount": float(o.report.total_amount),
            "payment_status": o.payment_status,
            "print_status": o.print_status,
            "utr_number": latest_payment.utr_number if latest_payment else None,
            "payer_vpa": latest_payment.payer_vpa if latest_payment else None,
            "screenshot_url": f"/api/v1/admin/orders/{o.id}/screenshot" if latest_payment and latest_payment.screenshot_path else None,
            "created_at": o.created_at,
            "completed_at": o.completed_at,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit,
    }


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
async def get_admin_order_detail(
    order_id: str,
    admin: Admin = Depends(get_current_admin),
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
        raise HTTPException(status_code=404, detail="Order not found.")

    latest_payment = order.payments[0] if order.payments else None
    upi_link = build_upi_deep_link(order.id, order.report.total_amount)
    screenshot_url = f"/api/v1/admin/orders/{order.id}/screenshot" if latest_payment and latest_payment.screenshot_path else None

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


@router.get("/orders/{order_id}/pdf")
async def download_order_pdf(
    order_id: str,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Order).options(selectinload(Order.report), selectinload(Order.student)).where(Order.id == order_id)
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order or not order.report:
        raise HTTPException(status_code=404, detail="Order or report not found.")

    file_path = settings.uploads_path / order.report.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report PDF not found on disk.")

    safe_name = f"{sanitize_filename_part(order.student.enrollment_number)}_{sanitize_filename_part(order.student.full_name)}_Report.pdf"

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=safe_name,
        content_disposition_type="attachment",
    )


@router.get("/orders/{order_id}/screenshot")
async def view_order_screenshot(
    order_id: str,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).where(Payment.order_id == order_id).order_by(desc(Payment.created_at))
    res = await db.execute(query)
    payment = res.scalars().first()

    if not payment or not payment.screenshot_path:
        raise HTTPException(status_code=404, detail="No screenshot available for this order.")

    file_path = settings.screenshots_path / payment.screenshot_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Screenshot file not found on disk.")

    return FileResponse(path=str(file_path))


@router.post("/orders/{order_id}/payment/confirm")
async def confirm_payment(
    order_id: str,
    payload: AdminConfirmPaymentRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.payments), selectinload(Order.report))
        .where(Order.id == order_id)
    )
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    payment = order.payments[0] if order.payments else None
    if not payment:
        payment = Payment(order_id=order.id, amount=order.report.total_amount)
        db.add(payment)

    # Note if amount received differs from expected
    note_details = f"Admin {admin.email} confirmed payment via manual_upi."
    if payload.received_amount is not None:
        if payload.received_amount != order.report.total_amount:
            note_details += f" Warning: Amount mismatch (Expected: ₹{order.report.total_amount:.2f}, Received: ₹{payload.received_amount:.2f})."
        payment.amount = payload.received_amount

    payment.status = "Successful"
    payment.confirmed_by = admin.id
    payment.confirmed_at = datetime.now(timezone.utc)
    payment.rejection_reason = None

    from_pay = order.payment_status
    from_print = order.print_status

    order.payment_status = "Successful"
    if order.print_status in ["Submitted", "Pending"]:
        order.print_status = "Ready for Printing"

    log = ActivityLog(
        order_id=order.id,
        actor_type="admin",
        actor_id=admin.email,
        from_state=f"{from_pay}/{from_print}",
        to_state=f"Successful/{order.print_status}",
        note=note_details,
    )
    db.add(log)

    await db.commit()
    return {"status": "success", "message": "Payment confirmed successfully."}


@router.post("/orders/{order_id}/payment/reject")
async def reject_payment(
    order_id: str,
    payload: AdminRejectPaymentRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.payments))
        .where(Order.id == order_id)
    )
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    payment = order.payments[0] if order.payments else None
    if payment:
        payment.status = "Rejected"
        payment.rejection_reason = payload.reason.strip()

    from_pay = order.payment_status
    order.payment_status = "Pending"  # Allows student to re-enter a valid UTR

    log = ActivityLog(
        order_id=order.id,
        actor_type="admin",
        actor_id=admin.email,
        from_state=from_pay,
        to_state="Pending (Rejected)",
        note=f"Payment rejected by {admin.email}. Reason: {payload.reason.strip()}",
    )
    db.add(log)

    await db.commit()
    return {"status": "rejected", "reason": payload.reason.strip()}


@router.patch("/orders/{order_id}/print-status")
async def update_print_status(
    order_id: str,
    payload: AdminUpdatePrintStatusRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    valid_statuses = {"Ready for Printing", "Printing", "Completed", "Cancelled"}
    if payload.print_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid print status. Must be one of: {', '.join(valid_statuses)}",
        )

    query = select(Order).where(Order.id == order_id)
    res = await db.execute(query)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    from_status = order.print_status
    order.print_status = payload.print_status

    if payload.print_status == "Completed":
        order.completed_at = datetime.now(timezone.utc)
    elif payload.print_status == "Cancelled":
        order.payment_status = "Cancelled"

    note_text = f"Print status changed from {from_status} to {payload.print_status}."
    if payload.note:
        note_text += f" Note: {payload.note.strip()}"

    log = ActivityLog(
        order_id=order.id,
        actor_type="admin",
        actor_id=admin.email,
        from_state=from_status,
        to_state=payload.print_status,
        note=note_text,
    )
    db.add(log)

    await db.commit()
    return {"status": "success", "print_status": order.print_status}


@router.post("/batches")
async def create_print_batch(
    payload: BatchCreateRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.report))
        .where(Order.id.in_(payload.order_ids))
    )
    res = await db.execute(query)
    orders = res.scalars().all()

    if not orders:
        raise HTTPException(status_code=400, detail="No matching orders found.")

    total_pages = sum(o.report.page_count for o in orders)
    total_sheets = sum(o.report.normal_sheets + o.report.special_sheets for o in orders)

    batch_name = payload.batch_name or f"Batch {datetime.now(timezone.utc).strftime('%b %d, %H:%M')}"
    batch = PrintBatch(
        batch_name=batch_name,
        created_by=admin.id,
        total_reports=len(orders),
        total_pages=total_pages,
        total_sheets=total_sheets,
    )
    db.add(batch)
    await db.flush()

    for o in orders:
        o.batch_id = batch.id
        if o.print_status == "Ready for Printing":
            o.print_status = "Printing"
            db.add(
                ActivityLog(
                    order_id=o.id,
                    actor_type="admin",
                    actor_id=admin.email,
                    from_state="Ready for Printing",
                    to_state="Printing",
                    note=f"Assigned to print batch: {batch_name}",
                )
            )

    await db.commit()

    return {
        "status": "success",
        "batch_id": str(batch.id),
        "batch_name": batch.batch_name,
        "total_reports": batch.total_reports,
        "total_pages": batch.total_pages,
        "total_sheets": batch.total_sheets,
    }


@router.post("/batches/export-zip")
async def export_batch_zip(
    payload: BatchCreateRequest,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.student), selectinload(Order.report))
        .where(Order.id.in_(payload.order_ids))
    )
    res = await db.execute(query)
    orders = res.scalars().all()

    if not orders:
        raise HTTPException(status_code=400, detail="No orders selected.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for order in orders:
            file_path = settings.uploads_path / order.report.stored_filename
            if file_path.exists():
                safe_name = f"{sanitize_filename_part(order.student.enrollment_number)}_{sanitize_filename_part(order.student.full_name)}_Report.pdf"
                zf.write(file_path, arcname=safe_name)

    zip_buffer.seek(0)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    zip_filename = f"Print_Station_Batch_{timestamp}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"},
    )


@router.get("/export/csv")
async def export_orders_csv(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.student),
            selectinload(Order.report),
            selectinload(Order.payments),
        )
        .order_by(desc(Order.created_at))
    )
    res = await db.execute(query)
    orders = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Order ID",
        "Student Name",
        "Enrollment Number",
        "Mobile Number",
        "Report Filename",
        "PDF Pages",
        "Normal Sheets",
        "Special Sheets",
        "Total Amount (INR)",
        "Payment Status",
        "Print Status",
        "UTR Number",
        "Payer VPA",
        "Submission Time (UTC)",
        "Completion Time (UTC)",
    ])

    for o in orders:
        p = o.payments[0] if o.payments else None
        writer.writerow([
            o.id,
            o.student.full_name,
            o.student.enrollment_number,
            o.student.mobile_number,
            o.report.original_filename,
            o.report.page_count,
            o.report.normal_sheets,
            o.report.special_sheets,
            f"{o.report.total_amount:.2f}",
            o.payment_status,
            o.print_status,
            p.utr_number if p else "",
            p.payer_vpa if p else "",
            o.created_at.isoformat() if o.created_at else "",
            o.completed_at.isoformat() if o.completed_at else "",
        ])

    output.seek(0)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=print_station_orders_{timestamp}.csv"},
    )


@router.get("/export/xlsx")
async def export_orders_xlsx(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(
            selectinload(Order.student),
            selectinload(Order.report),
            selectinload(Order.payments),
        )
        .order_by(desc(Order.created_at))
    )
    res = await db.execute(query)
    orders = res.scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Print Station Orders"

    # Header styling
    header_fill = PatternFill(start_color="144A38", end_color="144A38", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    data_font = Font(name="Arial", size=9)
    thin_border = Border(
        left=Side(style="thin", color="E0E0E0"),
        right=Side(style="thin", color="E0E0E0"),
        top=Side(style="thin", color="E0E0E0"),
        bottom=Side(style="thin", color="E0E0E0"),
    )

    headers = [
        "Order ID", "Student Name", "Enrollment Number", "Mobile",
        "Report Filename", "Pages", "Sheets", "Amount (₹)",
        "Payment", "Print Status", "UTR Number", "Date"
    ]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for o in orders:
        p = o.payments[0] if o.payments else None
        ws.append([
            o.id,
            o.student.full_name,
            o.student.enrollment_number,
            o.student.mobile_number,
            o.report.original_filename,
            o.report.page_count,
            o.report.normal_sheets + o.report.special_sheets,
            float(o.report.total_amount),
            o.payment_status,
            o.print_status,
            p.utr_number if p and p.utr_number else "-",
            o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else "-",
        ])

    for row in ws.iter_rows(min_row=2, max_row=len(orders) + 1, min_col=1, max_col=len(headers)):
        for cell in row:
            cell.font = data_font
            cell.border = thin_border

    # Adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=print_station_orders_{timestamp}.xlsx"},
    )
