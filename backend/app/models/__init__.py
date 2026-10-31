import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Numeric,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    enrollment_number = Column(String(20), unique=True, nullable=False, index=True)
    mobile_number = Column(String(10), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    orders = relationship("Order", back_populates="student", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    page_count = Column(Integer, nullable=False)
    pdf_hash = Column(String(64), nullable=False, index=True)
    colour_pages = Column(Integer, nullable=False)
    normal_sheets = Column(Integer, nullable=False)
    special_sheets = Column(Integer, default=2, nullable=False)
    blank_sides = Column(Integer, nullable=False)
    special_paper_cost = Column(Numeric(8, 2), nullable=False)
    colour_printing_cost = Column(Numeric(8, 2), nullable=False)
    total_amount = Column(Numeric(8, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    verification = relationship("ReportVerification", back_populates="report", uselist=False, cascade="all, delete-orphan")
    order = relationship("Order", back_populates="report", uselist=False)


class ReportVerification(Base):
    __tablename__ = "report_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    confirmed_hash = Column(String(64), nullable=False)
    confirmed_page_count = Column(Integer, nullable=False)
    is_final = Column(Boolean, default=True, nullable=False)
    confirmed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    report = relationship("Report", back_populates="verification")


class PrintBatch(Base):
    __tablename__ = "print_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_name = Column(String(100), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True)
    total_reports = Column(Integer, nullable=False)
    total_pages = Column(Integer, nullable=False)
    total_sheets = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    orders = relationship("Order", back_populates="batch")


class Order(Base):
    __tablename__ = "orders"

    # Human-friendly order ID, e.g. PR-261031-ABCD
    id = Column(String(20), primary_key=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="RESTRICT"), unique=True, nullable=False)
    
    # Separate payment & print lifecycle
    # payment_status: Pending, Verification Required, Successful, Failed, Cancelled
    payment_status = Column(String(30), default="Pending", nullable=False, index=True)
    # print_status: Submitted, Ready for Printing, Printing, Completed, Cancelled
    print_status = Column(String(30), default="Submitted", nullable=False, index=True)

    batch_id = Column(UUID(as_uuid=True), ForeignKey("print_batches.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("Student", back_populates="orders")
    report = relationship("Report", back_populates="order")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan", order_by="desc(Payment.created_at)")
    batch = relationship("PrintBatch", back_populates="orders")
    activity_logs = relationship("ActivityLog", back_populates="order", cascade="all, delete-orphan", order_by="asc(ActivityLog.created_at)")

    __table_args__ = (
        Index("ix_orders_statuses", "payment_status", "print_status"),
    )


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(String(20), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(8, 2), nullable=False)
    utr_number = Column(String(12), unique=True, nullable=True, index=True)
    payer_vpa = Column(String(100), nullable=True)
    screenshot_path = Column(String(255), nullable=True)
    
    # Statuses: Pending, Verification Required, Successful, Rejected
    status = Column(String(30), default="Pending", nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    confirmed_by = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    order = relationship("Order", back_populates="payments")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(String(20), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type = Column(String(20), nullable=False)  # student, admin, system
    actor_id = Column(String(100), nullable=True)
    from_state = Column(String(50), nullable=True)
    to_state = Column(String(50), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    order = relationship("Order", back_populates="activity_logs")
