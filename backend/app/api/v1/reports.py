from decimal import Decimal
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import Report, ReportVerification, Order
from backend.app.core.pdf import validate_and_inspect_pdf, PDFValidationError
from backend.app.core.pricing import calculate_printing_cost, PricingBreakdown
from backend.app.core.security import create_signed_token, verify_signed_token
from backend.app.schemas import (
    ReportUploadResponse,
    PricingBreakdownSchema,
    ReportVerifyRequest,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/upload", response_model=ReportUploadResponse)
async def upload_report(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents (.pdf) are accepted for printing.",
        )

    # Save to storage with randomized UUID filename
    unique_filename = f"{uuid.uuid4().hex}.pdf"
    target_path = settings.uploads_path / unique_filename

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store uploaded file: {str(e)}",
        )

    # Inspect and validate PDF via PyMuPDF
    try:
        inspection = validate_and_inspect_pdf(target_path, max_size_mb=settings.MAX_FILE_SIZE_MB)
    except PDFValidationError as e:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": e.code,
                "message": e.message,
                "details": e.details,
            },
        )

    # Calculate pricing
    breakdown = calculate_printing_cost(inspection.page_count)

    # Save Report record in DB
    report = Report(
        original_filename=file.filename,
        stored_filename=unique_filename,
        file_size=inspection.file_size_bytes,
        page_count=inspection.page_count,
        pdf_hash=inspection.pdf_hash,
        colour_pages=breakdown.colour_pages,
        normal_sheets=breakdown.normal_sheets,
        special_sheets=breakdown.special_sheets,
        blank_sides=breakdown.blank_sides,
        special_paper_cost=breakdown.special_paper_cost,
        colour_printing_cost=breakdown.colour_printing_cost,
        total_amount=breakdown.total_amount,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Generate signed preview token (valid for 12 hours)
    preview_token = create_signed_token(
        {"report_id": str(report.id), "pdf_hash": inspection.pdf_hash},
        expires_in_seconds=43200,
    )

    return ReportUploadResponse(
        report_id=report.id,
        original_filename=report.original_filename,
        file_size_bytes=report.file_size,
        page_count=report.page_count,
        pdf_hash=report.pdf_hash,
        breakdown=PricingBreakdownSchema(
            total_pages=breakdown.total_pages,
            colour_pages=breakdown.colour_pages,
            normal_sheets=breakdown.normal_sheets,
            special_sheets=breakdown.special_sheets,
            printed_sides=breakdown.printed_sides,
            blank_sides=breakdown.blank_sides,
            special_paper_cost=breakdown.special_paper_cost,
            colour_printing_cost=breakdown.colour_printing_cost,
            total_amount=breakdown.total_amount,
        ),
        preview_token=preview_token,
    )


@router.get("/{report_id}/preview")
async def preview_report(
    report_id: uuid.UUID,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report document not found.",
        )

    # Token check
    if token:
        payload = verify_signed_token(token)
        if not payload or payload.get("report_id") != str(report_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or expired preview access token.",
            )

    file_path = settings.uploads_path / report.stored_filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored PDF file not found on disk.",
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=report.original_filename,
        content_disposition_type="inline",
    )


@router.post("/{report_id}/verify")
async def verify_report(
    report_id: uuid.UUID,
    payload: ReportVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    # Server-side verification invariant check
    if payload.confirmed_hash != report.pdf_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification failed: The document hash does not match the uploaded file. Please review the current PDF.",
        )

    if payload.confirmed_page_count != report.page_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification failed: Confirmed page count does not match the analyzed PDF page count.",
        )

    if not payload.is_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document must be explicitly confirmed as final before proceeding.",
        )

    # Check if a verification record already exists
    ver_query = select(ReportVerification).where(ReportVerification.report_id == report_id)
    ver_result = await db.execute(ver_query)
    existing_ver = ver_result.scalar_one_or_none()

    if existing_ver:
        existing_ver.confirmed_hash = payload.confirmed_hash
        existing_ver.confirmed_page_count = payload.confirmed_page_count
        existing_ver.is_final = True
    else:
        new_ver = ReportVerification(
            report_id=report_id,
            confirmed_hash=payload.confirmed_hash,
            confirmed_page_count=payload.confirmed_page_count,
            is_final=True,
        )
        db.add(new_ver)

    await db.commit()

    return {
        "status": "verified",
        "report_id": report_id,
        "confirmed_hash": payload.confirmed_hash,
        "confirmed_page_count": payload.confirmed_page_count,
    }
