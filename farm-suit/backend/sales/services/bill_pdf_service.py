import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
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
        
        # Watermark for DRAFT or REVERSED
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

        # Footer page numbers and brand line
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor('#64748b'))
        self.drawString(40, 30, "Farm Suit — Unified Farm Business Management Platform")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 30, page_text)
        self.restoreState()

def generate_sales_bill_pdf(sales_bill):
    """
    Generates a professional, vector-sharp A4 PDF for a given SalesBill.
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

    # Custom styles
    brand_style = ParagraphStyle(
        'BrandTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#15803d')  # Emerald Green
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
        alignment=2,  # Right aligned
        textColor=colors.HexColor('#0f172a')
    )
    label_style = ParagraphStyle(
        'MetaLabel',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
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

    # 1. Header Grid (Brand Left, Invoice Meta Right)
    status_label = sales_bill.status
    header_data = [
        [
            Paragraph("FARM SUIT", brand_style),
            Paragraph("TAX INVOICE", invoice_title_style)
        ],
        [
            Paragraph("Farm Business Management Platform<br/>Agricultural Trading & Direct Production", tagline_style),
            Paragraph(f"<b>Bill No:</b> {sales_bill.bill_number}<br/><b>Date:</b> {sales_bill.bill_date}<br/><b>Status:</b> {status_label}", val_style)
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

    # Divider Line
    story.append(Table([['']], colWidths=[515], style=[
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, colors.HexColor('#15803d')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(Spacer(1, 12))

    # 2. Customer & Origin Details
    cust = sales_bill.customer
    cust_details = (
        f"<b>Customer Name:</b> {cust.customer_name}<br/>"
        f"<b>Code:</b> {cust.customer_code}<br/>"
        f"<b>Phone:</b> {cust.phone or 'N/A'}<br/>"
        f"<b>Email:</b> {cust.email or 'N/A'}<br/>"
        f"<b>GSTIN:</b> {cust.gst_number or 'Unregistered'}<br/>"
        f"<b>Address:</b> {cust.address or 'N/A'}"
    )

    creator_name = sales_bill.created_by.username if sales_bill.created_by else "Admin"
    origin_details = (
        f"<b>Issued By:</b> Farm Suit Operations<br/>"
        f"<b>Prepared By:</b> {creator_name}<br/>"
        f"<b>Payment Mode:</b> Cash / Bank Transfer<br/>"
        f"<b>Payment Terms:</b> Immediate on Delivery"
    )

    parties_table = Table([
        [Paragraph("BILLED TO", label_style), Paragraph("INVOICE DETAILS", label_style)],
        [Paragraph(cust_details, val_style), Paragraph(origin_details, val_style)]
    ], colWidths=[270, 245])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 15))

    # 3. Itemized Lines Table
    lines_header = [
        Paragraph("#", table_head_style),
        Paragraph("Item & Description", table_head_style),
        Paragraph("Qty", table_head_style),
        Paragraph("Unit", table_head_style),
        Paragraph("Rate (₹)", table_head_style),
        Paragraph("Amount (₹)", table_head_style)
    ]
    lines_rows = [lines_header]

    lines = sales_bill.lines.select_related('item', 'item__unit', 'inventory_lot').all()
    for idx, line in enumerate(lines, start=1):
        lot_info = f"<font size='7' color='#64748b'>Lot: {line.inventory_lot.lot_number} ({line.inventory_lot.source_type})</font>"
        item_cell = f"<b>{line.item.name}</b><br/>{lot_info}"

        lines_rows.append([
            Paragraph(str(idx), table_cell_style),
            Paragraph(item_cell, table_cell_style),
            Paragraph(str(line.quantity), table_cell_right),
            Paragraph(line.item.unit.short_name, table_cell_style),
            Paragraph(f"₹{line.selling_rate}", table_cell_right),
            Paragraph(f"₹{line.revenue}", table_cell_right)
        ])

    lines_table = Table(lines_rows, colWidths=[30, 215, 60, 50, 75, 85])
    lines_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#15803d')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#ffffff'), colors.HexColor('#f8fafc')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(lines_table)
    story.append(Spacer(1, 10))

    # 4. Totals Grid & Remarks
    remarks_text = f"<b>Remarks / Terms:</b><br/>{sales_bill.remarks or 'Thank you for your business!'}"
    totals_data = [
        [Paragraph(remarks_text, val_style), Paragraph("Subtotal:", table_cell_right_bold), Paragraph(f"₹{sales_bill.subtotal}", table_cell_right)],
        ["", Paragraph("Tax / GST:", table_cell_right_bold), Paragraph(f"₹{sales_bill.tax_amount}", table_cell_right)],
        ["", Paragraph("Discount:", table_cell_right_bold), Paragraph(f"- ₹{sales_bill.discount}", table_cell_right)],
        ["", Paragraph("Grand Total:", ParagraphStyle('GT', fontName='Helvetica-Bold', fontSize=11, leading=14, alignment=2, textColor=colors.HexColor('#15803d'))),
         Paragraph(f"₹{sales_bill.grand_total}", ParagraphStyle('GTVal', fontName='Helvetica-Bold', fontSize=11, leading=14, alignment=2, textColor=colors.HexColor('#15803d')))],
    ]

    totals_table = Table(totals_data, colWidths=[270, 140, 105])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (1, 3), (2, 3), 1, colors.HexColor('#15803d')),
        ('LINEBELOW', (1, 3), (2, 3), 1.5, colors.HexColor('#15803d')),
        ('BACKGROUND', (1, 3), (2, 3), colors.HexColor('#ecfdf5')),
    ]))
    story.append(KeepTogether(totals_table))
    story.append(Spacer(1, 30))

    # 5. Sign-off block
    sign_table = Table([
        [Paragraph("Customer Signature / Stamp", val_style), Paragraph("Authorized Signatory for Farm Suit", table_cell_right)],
        ["", ""],
        [Paragraph("____________________________", val_style), Paragraph("____________________________", table_cell_right)]
    ], colWidths=[250, 265])
    sign_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(KeepTogether(sign_table))

    # Canvas generator with watermark state
    def canvas_maker(*args, **kwargs):
        c = NumberedCanvas(*args, **kwargs)
        c._bill_status = sales_bill.status
        return c

    doc.build(story, canvasmaker=canvas_maker)
    buffer.seek(0)
    return buffer.getvalue()
