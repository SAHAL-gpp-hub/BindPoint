import io
from datetime import datetime, timezone
from decimal import Decimal
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect

def generate_receipt_pdf(order) -> bytes:
    """
    Generates a clean, professional PDF receipt for a student print order.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#144A38")   # Forest green / deep accent
    c_dark = colors.HexColor("#111827")      # Slate ink
    c_muted = colors.HexColor("#4B5563")     # Secondary text
    c_border = colors.HexColor("#E5E7EB")    # Line border
    c_bg = colors.HexColor("#F9FAFB")        # Subtle background

    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
    )
    subtitle_style = ParagraphStyle(
        "ReceiptSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_muted,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=c_primary,
        spaceAfter=6,
    )
    label_style = ParagraphStyle(
        "LabelStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=c_dark,
    )
    val_style = ParagraphStyle(
        "ValStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=c_dark,
    )
    val_mono = ParagraphStyle(
        "ValMono",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=10,
        leading=12,
        textColor=c_dark,
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=c_dark,
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=c_dark,
    )

    elements = []

    # Header Banner
    header_data = [
        [
            Paragraph("COLLEGE PRINT STATION", title_style),
            Paragraph(f"<b>ORDER RECEIPT</b><br/><font color='{c_muted.hexval()}'>Official Proof of Order</font>", ParagraphStyle("RightH", parent=title_style, fontSize=12, leading=15, alignment=2)),
        ],
        [
            Paragraph("Project Report Duplex Printing & Binding Services", subtitle_style),
            Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ParagraphStyle("RightSub", parent=subtitle_style, alignment=2)),
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 195])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # Divider line
    divider = Table([[""]], colWidths=[515], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_primary),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(divider)
    elements.append(Spacer(1, 15))

    # Order & Student Info
    order_id = getattr(order, "id", "PR-DEMO-0001")
    created_at_str = order.created_at.strftime("%Y-%m-%d %H:%M UTC") if getattr(order, "created_at", None) else "—"
    payment_status = getattr(order, "payment_status", "Pending")
    print_status = getattr(order, "print_status", "Submitted")

    student_name = order.student.full_name if getattr(order, "student", None) else "—"
    enrollment = order.student.enrollment_number if getattr(order, "student", None) else "—"
    mobile = order.student.mobile_number if getattr(order, "student", None) else "—"

    info_data = [
        [
            Paragraph("Order ID:", label_style),
            Paragraph(order_id, val_mono),
            Paragraph("Student Name:", label_style),
            Paragraph(student_name, val_style),
        ],
        [
            Paragraph("Submitted At:", label_style),
            Paragraph(created_at_str, val_style),
            Paragraph("Enrollment No:", label_style),
            Paragraph(enrollment, val_mono),
        ],
        [
            Paragraph("Payment Status:", label_style),
            Paragraph(payment_status, val_style),
            Paragraph("Mobile Phone:", label_style),
            Paragraph(mobile, val_mono),
        ],
        [
            Paragraph("Print Status:", label_style),
            Paragraph(print_status, val_style),
            Paragraph("Document File:", label_style),
            Paragraph(getattr(order.report, "original_filename", "report.pdf") if getattr(order, "report", None) else "—", val_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[95, 160, 95, 165])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Printing Breakdown & Charges Table
    elements.append(Paragraph("SPECIFICATIONS & CHARGES BREAKDOWN", heading_style))

    report = getattr(order, "report", None)
    page_count = report.page_count if report else 0
    normal_sheets = report.normal_sheets if report else 0
    special_sheets = report.special_sheets if report else 0
    colour_pages = report.colour_pages if report else 0
    special_cost = report.special_paper_cost if report else Decimal("0.00")
    colour_cost = report.colour_printing_cost if report else Decimal("0.00")
    total_amount = report.total_amount if report else Decimal("0.00")

    breakdown_data = [
        [
            Paragraph("Item Description", table_cell_bold),
            Paragraph("Specification", table_cell_bold),
            Paragraph("Quantity", table_cell_bold),
            Paragraph("Unit Rate", table_cell_bold),
            Paragraph("Amount (INR)", table_cell_bold),
        ],
        [
            Paragraph("Special Bond Paper", table_cell),
            Paragraph("Page 1 & Separators (100 GSM Bond)", table_cell),
            Paragraph(f"{special_sheets} Sheet(s)", table_cell),
            Paragraph("₹10.00 / sheet", table_cell),
            Paragraph(f"₹{special_cost:.2f}", table_cell),
        ],
        [
            Paragraph("Normal Paper (Duplex)", table_cell),
            Paragraph("Report Body (75 GSM Standard)", table_cell),
            Paragraph(f"{normal_sheets} Sheet(s)", table_cell),
            Paragraph("Included in duplex", table_cell),
            Paragraph("₹0.00", table_cell),
        ],
        [
            Paragraph("Colour Printing", table_cell),
            Paragraph("Duplex Colour Sides (including Page 1)", table_cell),
            Paragraph(f"{colour_pages + 1} Side(s)", table_cell),
            Paragraph("₹5.00 / side", table_cell),
            Paragraph(f"₹{colour_cost:.2f}", table_cell),
        ],
        [
            Paragraph("Total Pages in PDF", table_cell),
            Paragraph(f"{page_count} PDF pages (verified)", table_cell),
            Paragraph(f"{page_count} Pages", table_cell),
            Paragraph("—", table_cell),
            Paragraph("—", table_cell),
        ],
        [
            Paragraph("<b>TOTAL PAYABLE AMOUNT</b>", table_cell_bold),
            Paragraph("<b>All Taxes & Physical Printing Included</b>", table_cell_bold),
            Paragraph("—", table_cell_bold),
            Paragraph("—", table_cell_bold),
            Paragraph(f"<b>₹{total_amount:.2f}</b>", ParagraphStyle("TotalBold", parent=table_cell_bold, fontSize=11, textColor=c_primary)),
        ],
    ]

    breakdown_table = Table(breakdown_data, colWidths=[140, 155, 75, 75, 70])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#E6F4EA")),
    ]))
    # style headers white
    for i in range(5):
        breakdown_table.setStyle(TableStyle([
            ('TEXTCOLOR', (i, 0), (i, 0), colors.white)
        ]))
    elements.append(breakdown_table)
    elements.append(Spacer(1, 20))

    # Payment Verification Section
    elements.append(Paragraph("PAYMENT TRANSACTION DETAILS", heading_style))

    payment = order.payments[0] if getattr(order, "payments", None) and len(order.payments) > 0 else None
    utr_num = payment.utr_number if payment and payment.utr_number else "Not yet submitted / Pending"
    payer_vpa = payment.payer_vpa if payment and payment.payer_vpa else "N/A"
    confirmed_at = payment.confirmed_at.strftime("%Y-%m-%d %H:%M UTC") if payment and payment.confirmed_at else "Pending Admin Verification"

    pay_data = [
        [
            Paragraph("12-Digit UTR Reference:", label_style),
            Paragraph(utr_num, val_mono),
            Paragraph("Payer UPI ID:", label_style),
            Paragraph(payer_vpa, val_mono),
        ],
        [
            Paragraph("Verification Time:", label_style),
            Paragraph(confirmed_at, val_style),
            Paragraph("Payment Method:", label_style),
            Paragraph("UPI (BHIM / GPay / PhonePe / Paytm)", val_style),
        ]
    ]
    pay_table = Table(pay_data, colWidths=[130, 130, 110, 145])
    pay_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg),
        ('BOX', (0,0), (-1,-1), 1, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(pay_table)
    elements.append(Spacer(1, 20))

    # Collection Instructions Box
    instructions = getattr(order, "collection_instructions", None) or "Collect printed and bound reports from Project Lab Room 302 on weekdays between 3:00 PM and 5:00 PM. Present this Order ID or receipt at the counter."
    coll_data = [
        [Paragraph("<b>COLLECTION & DISPATCH INSTRUCTIONS</b>", ParagraphStyle("CollH", parent=label_style, textColor=colors.HexColor("#92400E")))],
        [Paragraph(f"{instructions}<br/><br/><b>Important Notice:</b> All documents are printed in duplex format with special 100 GSM bond paper for Page 1. Please inspect physical prints upon counter collection.", subtitle_style)]
    ]
    coll_table = Table(coll_data, colWidths=[515])
    coll_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(coll_table)

    doc.build(elements)
    return buffer.getvalue()
