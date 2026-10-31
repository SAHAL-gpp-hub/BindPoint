from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re

ENROLLMENT_REGEX = re.compile(r"^\d{12}$")
MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")
UTR_REGEX = re.compile(r"^\d{12}$")


class StudentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    enrollment_number: str = Field(..., description="12-digit university enrollment number")
    mobile_number: str = Field(..., description="10-digit Indian mobile number")

    @field_validator("enrollment_number")
    @classmethod
    def validate_enrollment(cls, v: str) -> str:
        clean = v.strip()
        if not ENROLLMENT_REGEX.match(clean):
            raise ValueError("Enrollment number must be exactly 12 numeric digits.")
        return clean

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean = v.strip()
        if not MOBILE_REGEX.match(clean):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return clean

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = " ".join(v.strip().split())
        if len(clean) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return clean


class PricingBreakdownSchema(BaseModel):
    total_pages: int
    colour_pages: int
    normal_sheets: int
    special_sheets: int
    printed_sides: int
    blank_sides: int
    special_paper_cost: Decimal
    colour_printing_cost: Decimal
    total_amount: Decimal


class ReportUploadResponse(BaseModel):
    report_id: UUID
    original_filename: str
    file_size_bytes: int
    page_count: int
    pdf_hash: str
    breakdown: PricingBreakdownSchema
    preview_token: str


class ReportVerifyRequest(BaseModel):
    confirmed_hash: str = Field(..., min_length=64, max_length=64)
    confirmed_page_count: int = Field(..., ge=2)
    is_final: bool = True


class OrderCreateRequest(BaseModel):
    full_name: str
    enrollment_number: str
    mobile_number: str
    report_id: UUID

    @field_validator("enrollment_number")
    @classmethod
    def validate_enrollment(cls, v: str) -> str:
        clean = v.strip()
        if not ENROLLMENT_REGEX.match(clean):
            raise ValueError("Enrollment number must be exactly 12 numeric digits.")
        return clean

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean = v.strip()
        if not MOBILE_REGEX.match(clean):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile number.")
        return clean


class PaymentSubmitRequest(BaseModel):
    utr_number: str = Field(..., description="12-digit bank/UPI UTR transaction reference")
    payer_vpa: Optional[str] = Field(None, max_length=100)

    @field_validator("utr_number")
    @classmethod
    def validate_utr(cls, v: str) -> str:
        clean = v.strip()
        if not UTR_REGEX.match(clean):
            raise ValueError("Transaction UTR must be exactly 12 numeric digits.")
        return clean


class StudentSummary(BaseModel):
    full_name: str
    enrollment_number: str
    mobile_number: str


class ReportSummary(BaseModel):
    id: UUID
    original_filename: str
    file_size: int
    page_count: int
    pdf_hash: str
    breakdown: PricingBreakdownSchema


class ActivityLogEntry(BaseModel):
    actor_type: str
    from_state: Optional[str] = None
    to_state: str
    note: Optional[str] = None
    created_at: datetime


class PaymentSummary(BaseModel):
    amount: Decimal
    utr_number: Optional[str] = None
    payer_vpa: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    screenshot_url: Optional[str] = None
    created_at: datetime


class OrderDetailResponse(BaseModel):
    order_id: str
    student: StudentSummary
    report: ReportSummary
    payment_status: str
    print_status: str
    upi_id: str
    payee_name: str
    upi_deep_link: str
    qr_data: str
    collection_instructions: str
    payment: Optional[PaymentSummary] = None
    timeline: List[ActivityLogEntry] = []
    created_at: datetime
    completed_at: Optional[datetime] = None


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminConfirmPaymentRequest(BaseModel):
    received_amount: Optional[Decimal] = None


class AdminRejectPaymentRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class AdminUpdatePrintStatusRequest(BaseModel):
    print_status: str
    note: Optional[str] = None


class BatchCreateRequest(BaseModel):
    order_ids: List[str] = Field(..., min_items=1)
    batch_name: Optional[str] = None


class DashboardMetricsResponse(BaseModel):
    total_submissions: int
    total_reports_received: int
    pending_payments: int
    verification_required_payments: int
    confirmed_payments: int
    ready_for_printing: int
    currently_printing: int
    completed_reports: int
    total_confirmed_revenue: Decimal
