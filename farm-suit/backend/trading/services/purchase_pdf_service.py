import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print total page numbers and watermarks.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        status = getattr(self, '_bill_status', 'POSTED')
        if status in ('DRAFT', 'REVERSED', 'CANCELLED'):
            self.setFont("Helvetica-Bold", 60)
            if status == 'DRAFT':
                self.setFillColor(colors.HexColor('#94a3b8'), alpha=0.18)
            else:
                self.setFillColor(colors.HexColor('#ef4444'), alpha=0.18)
            self.rotate(45)
            self.drawString(200, 100, status)
            self.rotate(-45)

        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(40, 30, "Farm Suit — Unified Farm Business Management Platform")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 30, page_text)
        self.restoreState()

def generate_purchase_bill_pdf(purchase_bill):
    """
    Generates a professional, vector-sharp A4 PDF for a given PurchaseBill.
    Returns bytes in an in-memory buffer.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    brand_style = ParagraphStyle(
        'BrandTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0369a1')  # Ocean Blue
    )
    tagline_style = ParagraphStyle(
        'BrandTagline',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    invoice_title_style = ParagraphStyle(
        'InvoiceTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=2,
        textColor=colors.HexColor('#0f172a')
    )
    val_style = ParagraphStyle(
        'MetaValue',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )
    table_head_style = ParagraphStyle(
        'TableHead',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#ffffff')
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )
    table_cell_right = ParagraphStyle(
        'TableCellRight',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=colors.HexColor('#0f172a')
    )
    table_cell_right_bold = ParagraphStyle(
        'TableCellRightBold',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=2,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # 1. Header Grid
    status_label = f"{purchase_bill.status} ({purchase_bill.payment_status})"
    header_data = [
        [
            Paragraph("FARM SUIT", brand_style),
            Paragraph("PURCHASE BILL", invoice_title_style)
        ],
        [
            Paragraph("Farm Business Management Platform<br/>External Trade Procurement", tagline_style),
            Paragraph(
                f"<b>Bill No:</b> {purchase_bill.bill_number}<br/>"
                f"<b>Bill Date:</b> {purchase_bill.bill_date}<br/>"
                f"<b>Received Date:</b> {purchase_bill.received_date}<br/>"
                f"<b>Status:</b> {status_label}",
                val_style
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[300, 215])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))

    # Divider
    story.append(Table([['']], colWidths=[515], style=[
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, colors.HexColor('#0369a1')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(Spacer(1, 12))

    # 2. Vendor Details
    vendor = purchase_bill.vendor
    vendor_details = (
        f"<b>Vendor Name:</b> {vendor.vendor_name}<br/>"
        f"<b>Code:</b> {vendor.vendor_code}<br/>"
        f"<b>Phone:</b> {vendor.phone or 'N/A'}<br/>"
        f"<b>GSTIN:</b> {vendor.gst_number or 'N/A'}<br/>"
        f"<b>Address:</b> {vendor.address or 'N/A'}"
    )

    procurement_meta = (
        f"<b>Accepted By:</b> {purchase_bill.accepted_by.username if purchase_bill.accepted_by else 'Admin'}<br/>"
        f"<b>Payment Status:</b> {purchase_bill.payment_status}<br/>"
        f"<b>Total Landed Cost:</b> ₹{purchase_bill.total_landed_cost}<br/>"
        f"<b>Amount Paid:</b> ₹{purchase_bill.amount_paid}<br/>"
        f"<b>Balance Payable:</b> ₹{purchase_bill.remaining_balance}"
    )

    parties_table = Table([
        [
            Paragraph("<b>VENDOR / SUPPLIER DETAILS</b>", val_style),
            Paragraph("<b>PROCUREMENT SUMMARY</b>", val_style)
        ],
        [
            Paragraph(vendor_details, val_style),
            Paragraph(procurement_meta, val_style)
        ]
    ], colWidths=[270, 245])

    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 16))

    # 3. Line Items
    items_header = [
        Paragraph("#", table_head_style),
        Paragraph("Item / Description", table_head_style),
        Paragraph("Quantity", table_head_style),
        Paragraph("Unit Rate (₹)", table_head_style),
        Paragraph("Amount (₹)", table_head_style),
        Paragraph("Landed Unit (₹)", table_head_style),
    ]

    items_data = [items_header]
    for idx, line in enumerate(purchase_bill.lines.select_related('item', 'item__unit').all(), start=1):
        items_data.append([
            Paragraph(str(idx), table_cell_style),
            Paragraph(f"<b>{line.item.name}</b><br/><font size=7.5 color='#64748b'>Code: {line.item.item_code}</font>", table_cell_style),
            Paragraph(f"{line.quantity} {line.item.unit.short_name}", table_cell_right),
            Paragraph(f"{line.unit_rate:.2f}", table_cell_right),
            Paragraph(f"{line.amount:.2f}", table_cell_right),
            Paragraph(f"{line.landed_unit_cost:.2f}", table_cell_right),
        ])

    items_table = Table(items_data, colWidths=[25, 170, 85, 75, 80, 80])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0369a1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # 4. Financial Totals & Landed Cost Breakdown
    totals_data = [
        [Paragraph("Base Subtotal:", table_cell_style), Paragraph(f"₹{purchase_bill.subtotal:.2f}", table_cell_right)],
        [Paragraph("Discount (-):", table_cell_style), Paragraph(f"₹{purchase_bill.discount:.2f}", table_cell_right)],
        [Paragraph("<b>Vendor Payable Total:</b>", table_cell_style), Paragraph(f"<b>₹{purchase_bill.grand_total:.2f}</b>", table_cell_right_bold)],
        [Paragraph("Transport Cost:", table_cell_style), Paragraph(f"₹{purchase_bill.transport_cost:.2f}", table_cell_right)],
        [Paragraph("Packaging Cost:", table_cell_style), Paragraph(f"₹{purchase_bill.packaging_cost:.2f}", table_cell_right)],
        [Paragraph("Other Procurement Costs:", table_cell_style), Paragraph(f"₹{purchase_bill.other_procurement_costs:.2f}", table_cell_right)],
        [Paragraph("<b>Total Landed Inventory Cost:</b>", table_cell_style), Paragraph(f"<b>₹{purchase_bill.total_landed_cost:.2f}</b>", table_cell_right_bold)],
        [Paragraph("Amount Paid to Vendor:", table_cell_style), Paragraph(f"₹{purchase_bill.amount_paid:.2f}", table_cell_right)],
        [Paragraph("<b>Outstanding Balance Payable:</b>", table_cell_style), Paragraph(f"<b>₹{purchase_bill.remaining_balance:.2f}</b>", table_cell_right_bold)],
    ]

    totals_table = Table(totals_data, colWidths=[180, 100])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 2), (-1, 2), 1, colors.HexColor('#cbd5e1')),
        ('LINEBELOW', (0, 6), (-1, 6), 1, colors.HexColor('#0369a1')),
    ]))

    remarks_text = f"<b>Notes:</b><br/>{purchase_bill.remarks or 'Procurement verified against vendor invoice.'}"
    remarks_para = Paragraph(remarks_text, val_style)

    summary_grid = Table([
        [remarks_para, totals_table]
    ], colWidths=[235, 280])
    summary_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether(summary_grid))

    # Build document
    canvas_maker = lambda *args, **kwargs: NumberedCanvas(*args, **kwargs)
    doc.build(story, canvasmaker=canvas_maker)

    buffer.seek(0)
    return buffer.getvalue()
