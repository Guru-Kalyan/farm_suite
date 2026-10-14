import datetime
from decimal import Decimal
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count
from django.http import HttpResponse
from django.utils import timezone
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from masters.views import paginate_queryset
from .models import PurchaseBill, VendorPayment
from .services.purchase_service import (
    save_purchase_bill,
    post_purchase_bill,
    reverse_purchase_bill,
    record_vendor_payment
)
from .services.purchase_pdf_service import generate_purchase_bill_pdf
from sales.models import SalesBill, SalesLine, SalesPayment

@require_http_methods(["GET", "POST"])
@api_login_required
def purchases_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        vendor_id = request.GET.get("vendor_id", "").strip()
        status = request.GET.get("status", "").strip().upper()
        payment_status = request.GET.get("payment_status", "").strip().upper()
        from_date = request.GET.get("from_date", "").strip()
        to_date = request.GET.get("to_date", "").strip()
        date_preset = request.GET.get("date_preset", "").strip().lower()
        month = request.GET.get("month", "").strip()
        year = request.GET.get("year", "").strip()
        item_id = request.GET.get("item_id", "").strip()
        payment_method = request.GET.get("payment_method", "").strip().upper()

        qs = PurchaseBill.objects.select_related('vendor', 'accepted_by').all()

        if search:
            qs = qs.filter(
                Q(bill_number__icontains=search) |
                Q(vendor__vendor_name__icontains=search) |
                Q(vendor__vendor_code__icontains=search)
            )
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if status in ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'):
            qs = qs.filter(status=status)
        if payment_status in ('UNPAID', 'PARTIALLY_PAID', 'PAID'):
            qs = qs.filter(payment_status=payment_status)

        # Date preset
        today = timezone.now().date()
        if date_preset == "today":
            qs = qs.filter(bill_date=today)
        elif date_preset == "yesterday":
            qs = qs.filter(bill_date=today - datetime.timedelta(days=1))
        elif date_preset == "this_week":
            start_week = today - datetime.timedelta(days=today.weekday())
            qs = qs.filter(bill_date__gte=start_week, bill_date__lte=today)
        elif date_preset == "this_month":
            start_month = today.replace(day=1)
            qs = qs.filter(bill_date__gte=start_month, bill_date__lte=today)
        elif date_preset == "prev_month":
            first_this_month = today.replace(day=1)
            last_prev_month = first_this_month - datetime.timedelta(days=1)
            first_prev_month = last_prev_month.replace(day=1)
            qs = qs.filter(bill_date__gte=first_prev_month, bill_date__lte=last_prev_month)
        else:
            if from_date:
                qs = qs.filter(bill_date__gte=from_date)
            if to_date:
                qs = qs.filter(bill_date__lte=to_date)

        if month and month.isdigit():
            qs = qs.filter(bill_date__month=int(month))
        if year and year.isdigit():
            qs = qs.filter(bill_date__year=int(year))

        if item_id:
            qs = qs.filter(lines__item_id=item_id).distinct()
        if payment_method:
            qs = qs.filter(payments__payment_method=payment_method).distinct()

        # Compute summary metrics for filtered set
        posted_qs = qs.filter(status='POSTED')
        totals = posted_qs.aggregate(
            total_purchases=Sum('grand_total'),
            total_landed=Sum('total_landed_cost'),
            total_paid=Sum('amount_paid'),
            transport=Sum('transport_cost'),
            packaging=Sum('packaging_cost'),
            other_costs=Sum('other_procurement_costs')
        )
        tot_purchases = totals['total_purchases'] or Decimal('0.00')
        tot_landed = totals['total_landed'] or Decimal('0.00')
        tot_paid = totals['total_paid'] or Decimal('0.00')
        tot_out = max(Decimal('0.00'), tot_purchases - tot_paid)

        status_counts = qs.aggregate(
            paid=Count('id', filter=Q(payment_status='PAID')),
            partially_paid=Count('id', filter=Q(payment_status='PARTIALLY_PAID')),
            unpaid=Count('id', filter=Q(payment_status='UNPAID')),
            total_count=Count('id')
        )

        summary = {
            "total_purchases": str(tot_purchases),
            "total_landed_cost": str(tot_landed),
            "total_paid": str(tot_paid),
            "total_outstanding": str(tot_out),
            "total_transport": str(totals['transport'] or Decimal('0.00')),
            "total_packaging": str(totals['packaging'] or Decimal('0.00')),
            "total_other_costs": str(totals['other_costs'] or Decimal('0.00')),
            "total_bills": status_counts['total_count'] or 0,
            "paid_bills": status_counts['paid'] or 0,
            "partially_paid_bills": status_counts['partially_paid'] or 0,
            "unpaid_bills": status_counts['unpaid'] or 0,
        }

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": b.id,
            "bill_number": b.bill_number,
            "vendor": {
                "id": b.vendor.id,
                "vendor_name": b.vendor.vendor_name,
                "vendor_code": b.vendor.vendor_code,
                "phone": b.vendor.phone
            },
            "bill_date": b.bill_date,
            "received_date": b.received_date,
            "accepted_by": b.accepted_by.username if b.accepted_by else "",
            "subtotal": str(b.subtotal),
            "tax_amount": str(b.tax_amount),
            "discount": str(b.discount),
            "grand_total": str(b.grand_total),
            "transport_cost": str(b.transport_cost),
            "packaging_cost": str(b.packaging_cost),
            "other_procurement_costs": str(b.other_procurement_costs),
            "total_landed_cost": str(b.total_landed_cost),
            "amount_paid": str(b.amount_paid),
            "remaining_balance": str(b.remaining_balance),
            "payment_status": b.payment_status,
            "status": b.status,
            "remarks": b.remarks,
            "lines_count": b.lines.count(),
            "payments_count": b.payments.count(),
            "created_at": b.created_at
        } for b in paginated['items']]

        return json_success({
            "purchases": data,
            "summary": summary,
            "pagination": paginated['pagination']
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            bill = save_purchase_bill(data, request.user)
            return json_success({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "grand_total": str(bill.grand_total),
                "total_landed_cost": str(bill.total_landed_cost),
                "amount_paid": str(bill.amount_paid),
                "remaining_balance": str(bill.remaining_balance),
                "payment_status": bill.payment_status,
                "status": bill.status
            }, message="Purchase bill draft created successfully", status=201)
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["GET", "PUT"])
@api_login_required
def purchase_detail_view(request, pk):
    try:
        bill = PurchaseBill.objects.select_related('vendor', 'accepted_by').prefetch_related(
            'lines__item', 'lines__item__unit', 'lines__inventory_lots', 'payments__recorded_by'
        ).get(pk=pk)
    except PurchaseBill.DoesNotExist:
        return json_error("Purchase bill not found", status=404)

    if request.method == "GET":
        lines_data = []
        for line in bill.lines.all():
            lots_data = [{
                "lot_id": lot.id,
                "lot_number": lot.lot_number,
                "original_quantity": str(lot.original_quantity),
                "available_quantity": str(lot.available_quantity),
                "unit_cost": str(lot.unit_cost),
                "status": lot.status
            } for lot in line.inventory_lots.all()]

            lines_data.append({
                "id": line.id,
                "item": {
                    "id": line.item.id,
                    "name": line.item.name,
                    "item_code": line.item.item_code,
                    "unit": line.item.unit.short_name
                },
                "quantity": str(line.quantity),
                "unit_rate": str(line.unit_rate),
                "amount": str(line.amount),
                "allocated_procurement_cost": str(line.allocated_procurement_cost),
                "landed_cost": str(line.landed_cost),
                "landed_unit_cost": str(line.landed_unit_cost),
                "remarks": line.remarks,
                "inventory_lots": lots_data
            })

        payments_data = [{
            "id": p.id,
            "payment_date": p.payment_date,
            "amount": str(p.amount),
            "payment_method": p.payment_method,
            "payment_method_display": p.get_payment_method_display(),
            "reference_number": p.reference_number,
            "notes": p.notes,
            "recorded_by": p.recorded_by.username if p.recorded_by else "",
            "created_at": p.created_at
        } for p in bill.payments.all()]

        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "vendor": {
                "id": bill.vendor.id,
                "vendor_name": bill.vendor.vendor_name,
                "vendor_code": bill.vendor.vendor_code,
                "phone": bill.vendor.phone,
                "email": bill.vendor.email,
                "address": bill.vendor.address,
                "gst_number": bill.vendor.gst_number
            },
            "bill_date": bill.bill_date,
            "received_date": bill.received_date,
            "accepted_by": bill.accepted_by.username if bill.accepted_by else "",
            "subtotal": str(bill.subtotal),
            "tax_amount": str(bill.tax_amount),
            "discount": str(bill.discount),
            "grand_total": str(bill.grand_total),
            "transport_cost": str(bill.transport_cost),
            "packaging_cost": str(bill.packaging_cost),
            "other_procurement_costs": str(bill.other_procurement_costs),
            "total_landed_cost": str(bill.total_landed_cost),
            "amount_paid": str(bill.amount_paid),
            "remaining_balance": str(bill.remaining_balance),
            "payment_status": bill.payment_status,
            "status": bill.status,
            "remarks": bill.remarks,
            "lines": lines_data,
            "payments": payments_data,
            "created_at": bill.created_at,
            "updated_at": bill.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            bill = save_purchase_bill(data, request.user, bill_id=pk)
            return json_success({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "grand_total": str(bill.grand_total),
                "total_landed_cost": str(bill.total_landed_cost),
                "status": bill.status
            }, message="Purchase bill draft updated successfully")
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["POST"])
@api_login_required
def post_purchase_view(request, pk):
    try:
        bill = post_purchase_bill(pk, request.user)
        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "grand_total": str(bill.grand_total),
            "total_landed_cost": str(bill.total_landed_cost),
            "amount_paid": str(bill.amount_paid),
            "remaining_balance": str(bill.remaining_balance),
            "payment_status": bill.payment_status,
            "status": bill.status
        }, message=f"Purchase bill {bill.bill_number} posted successfully. Inventory lots created with landed unit costs.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["POST"])
@api_login_required
def reverse_purchase_view(request, pk):
    data = parse_json_body(request)
    reason = data.get("reason", "") if data else ""

    try:
        bill = reverse_purchase_bill(pk, request.user, reason)
        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "status": bill.status
        }, message=f"Purchase bill {bill.bill_number} reversed successfully. Inventory adjusted.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["GET", "POST"])
@api_login_required
def purchase_payments_view(request, pk):
    """
    GET /api/purchases/<pk>/payments/ -> List payments for this purchase bill
    POST /api/purchases/<pk>/payments/ -> Record a vendor payment
    """
    try:
        bill = PurchaseBill.objects.get(pk=pk)
    except PurchaseBill.DoesNotExist:
        return json_error("Purchase bill not found", status=404)

    if request.method == "GET":
        payments = bill.payments.select_related('recorded_by').all()
        data = [{
            "id": p.id,
            "payment_date": p.payment_date,
            "amount": str(p.amount),
            "payment_method": p.payment_method,
            "payment_method_display": p.get_payment_method_display(),
            "reference_number": p.reference_number,
            "notes": p.notes,
            "recorded_by": p.recorded_by.username if p.recorded_by else "",
            "created_at": p.created_at
        } for p in payments]
        return json_success({
            "bill_id": bill.id,
            "bill_number": bill.bill_number,
            "grand_total": str(bill.grand_total),
            "amount_paid": str(bill.amount_paid),
            "remaining_balance": str(bill.remaining_balance),
            "payment_status": bill.payment_status,
            "payments": data
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            payment, updated_bill = record_vendor_payment(pk, data, request.user)
            return json_success({
                "payment": {
                    "id": payment.id,
                    "payment_date": payment.payment_date,
                    "amount": str(payment.amount),
                    "payment_method": payment.payment_method,
                    "reference_number": payment.reference_number,
                    "notes": payment.notes
                },
                "bill": {
                    "id": updated_bill.id,
                    "bill_number": updated_bill.bill_number,
                    "grand_total": str(updated_bill.grand_total),
                    "amount_paid": str(updated_bill.amount_paid),
                    "remaining_balance": str(updated_bill.remaining_balance),
                    "payment_status": updated_bill.payment_status
                }
            }, message=f"Vendor payment of ₹{payment.amount} recorded successfully. Remaining payable: ₹{updated_bill.remaining_balance}", status=201)
        except ValidationError as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else (e.messages[0] if hasattr(e, 'messages') else str(e))
            return json_error(message="Payment recording failed", errors=msg, status=400)

@require_http_methods(["GET"])
@api_login_required
def all_vendor_payments_view(request):
    """
    GET /api/purchases/vendor-payments/ -> List all vendor payments across all purchase bills
    """
    vendor_id = request.GET.get("vendor_id", "").strip()
    from_date = request.GET.get("from_date", "").strip()
    to_date = request.GET.get("to_date", "").strip()
    payment_method = request.GET.get("payment_method", "").strip().upper()
    search = request.GET.get("search", "").strip()

    qs = VendorPayment.objects.select_related('purchase_bill', 'vendor', 'recorded_by').all()

    if search:
        qs = qs.filter(
            Q(purchase_bill__bill_number__icontains=search) |
            Q(vendor__vendor_name__icontains=search) |
            Q(reference_number__icontains=search)
        )
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    if from_date:
        qs = qs.filter(payment_date__gte=from_date)
    if to_date:
        qs = qs.filter(payment_date__lte=to_date)
    if payment_method:
        qs = qs.filter(payment_method=payment_method)

    total_amount = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": p.id,
        "payment_date": p.payment_date,
        "amount": str(p.amount),
        "payment_method": p.payment_method,
        "payment_method_display": p.get_payment_method_display(),
        "reference_number": p.reference_number,
        "notes": p.notes,
        "purchase_bill": {
            "id": p.purchase_bill.id,
            "bill_number": p.purchase_bill.bill_number,
            "grand_total": str(p.purchase_bill.grand_total),
            "total_landed_cost": str(p.purchase_bill.total_landed_cost),
            "payment_status": p.purchase_bill.payment_status
        },
        "vendor": {
            "id": p.vendor.id,
            "vendor_name": p.vendor.vendor_name,
            "vendor_code": p.vendor.vendor_code
        },
        "recorded_by": p.recorded_by.username if p.recorded_by else "",
        "created_at": p.created_at
    } for p in paginated['items']]

    return json_success({
        "payments": data,
        "total_amount": str(total_amount),
        "pagination": paginated['pagination']
    })

@require_http_methods(["GET"])
@api_login_required
def download_purchase_pdf_view(request, pk):
    """
    GET /api/purchases/<id>/pdf/
    Returns application/pdf attachment named FarmSuit_PurchaseBill_<bill_number>.pdf
    """
    try:
        bill = PurchaseBill.objects.select_related('vendor', 'accepted_by').prefetch_related(
            'lines__item', 'lines__item__unit'
        ).get(pk=pk)
    except PurchaseBill.DoesNotExist:
        return json_error("Purchase bill not found", status=404)

    try:
        pdf_bytes = generate_purchase_bill_pdf(bill)
        filename = f"FarmSuit_PurchaseBill_{bill.bill_number}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Filename'] = filename
        return response
    except Exception as e:
        return json_error(f"Failed to generate purchase bill PDF: {str(e)}", status=500)

@require_http_methods(["GET"])
@api_login_required
def trade_dashboard_view(request):
    """
    Feature Three — Trade Dashboard and History (Section 6.4):
    Aggregates trade procurement, trade sales, COGS, selling expenses, and net profit.
    """
    from_date = request.GET.get("from_date", "").strip()
    to_date = request.GET.get("to_date", "").strip()
    date_preset = request.GET.get("date_preset", "").strip().lower()
    month = request.GET.get("month", "").strip()
    year = request.GET.get("year", "").strip()
    customer_id = request.GET.get("customer_id", "").strip()
    vendor_id = request.GET.get("vendor_id", "").strip()
    item_id = request.GET.get("item_id", "").strip()

    # Base querysets
    purchases_qs = PurchaseBill.objects.filter(status='POSTED')
    # Trade Sales: sales with sale_type='TRADE' or sales consuming PURCHASE lots
    sales_qs = SalesBill.objects.filter(status='POSTED', sale_type='TRADE')

    today = timezone.now().date()
    if date_preset == "today":
        purchases_qs = purchases_qs.filter(bill_date=today)
        sales_qs = sales_qs.filter(bill_date=today)
    elif date_preset == "yesterday":
        yday = today - datetime.timedelta(days=1)
        purchases_qs = purchases_qs.filter(bill_date=yday)
        sales_qs = sales_qs.filter(bill_date=yday)
    elif date_preset == "this_week":
        start_week = today - datetime.timedelta(days=today.weekday())
        purchases_qs = purchases_qs.filter(bill_date__gte=start_week, bill_date__lte=today)
        sales_qs = sales_qs.filter(bill_date__gte=start_week, bill_date__lte=today)
    elif date_preset == "this_month":
        start_month = today.replace(day=1)
        purchases_qs = purchases_qs.filter(bill_date__gte=start_month, bill_date__lte=today)
        sales_qs = sales_qs.filter(bill_date__gte=start_month, bill_date__lte=today)
    elif date_preset == "prev_month":
        first_this = today.replace(day=1)
        last_prev = first_this - datetime.timedelta(days=1)
        first_prev = last_prev.replace(day=1)
        purchases_qs = purchases_qs.filter(bill_date__gte=first_prev, bill_date__lte=last_prev)
        sales_qs = sales_qs.filter(bill_date__gte=first_prev, bill_date__lte=last_prev)
    else:
        if from_date:
            purchases_qs = purchases_qs.filter(bill_date__gte=from_date)
            sales_qs = sales_qs.filter(bill_date__gte=from_date)
        if to_date:
            purchases_qs = purchases_qs.filter(bill_date__lte=to_date)
            sales_qs = sales_qs.filter(bill_date__lte=to_date)

    if month and month.isdigit():
        purchases_qs = purchases_qs.filter(bill_date__month=int(month))
        sales_qs = sales_qs.filter(bill_date__month=int(month))
    if year and year.isdigit():
        purchases_qs = purchases_qs.filter(bill_date__year=int(year))
        sales_qs = sales_qs.filter(bill_date__year=int(year))

    if vendor_id:
        purchases_qs = purchases_qs.filter(vendor_id=vendor_id)
    if customer_id:
        sales_qs = sales_qs.filter(customer_id=customer_id)
    if item_id:
        purchases_qs = purchases_qs.filter(lines__item_id=item_id).distinct()
        sales_qs = sales_qs.filter(lines__item_id=item_id).distinct()

    # Procurement Totals
    pur_agg = purchases_qs.aggregate(
        total_procurement_cost=Sum('subtotal'),
        total_landed_cost=Sum('total_landed_cost'),
        total_transport=Sum('transport_cost'),
        total_packaging=Sum('packaging_cost'),
        total_other=Sum('other_procurement_costs'),
        total_paid_vendors=Sum('amount_paid'),
        total_grand=Sum('grand_total')
    )
    tot_procure = pur_agg['total_procurement_cost'] or Decimal('0.00')
    tot_landed = pur_agg['total_landed_cost'] or Decimal('0.00')
    tot_pur_transport = pur_agg['total_transport'] or Decimal('0.00')
    tot_pur_packaging = pur_agg['total_packaging'] or Decimal('0.00')
    tot_pur_other = pur_agg['total_other'] or Decimal('0.00')
    tot_paid_vendors = pur_agg['total_paid_vendors'] or Decimal('0.00')
    tot_pur_grand = pur_agg['total_grand'] or Decimal('0.00')
    outstanding_vendor_payables = max(Decimal('0.00'), tot_pur_grand - tot_paid_vendors)

    # Trade Sales Totals
    sales_agg = sales_qs.aggregate(
        total_revenue=Sum('grand_total'),
        total_received_customers=Sum('amount_paid'),
        total_sell_transport=Sum('transport_cost'),
        total_sell_packaging=Sum('packaging_cost'),
        total_sell_other=Sum('other_selling_expenses')
    )
    tot_revenue = sales_agg['total_revenue'] or Decimal('0.00')
    tot_received_customers = sales_agg['total_received_customers'] or Decimal('0.00')
    tot_sell_transport = sales_agg['total_sell_transport'] or Decimal('0.00')
    tot_sell_packaging = sales_agg['total_sell_packaging'] or Decimal('0.00')
    tot_sell_other = sales_agg['total_sell_other'] or Decimal('0.00')
    outstanding_customer_receivables = max(Decimal('0.00'), tot_revenue - tot_received_customers)

    # COGS & Gross Profit from SalesLines of matching trade sales
    trade_sales_lines = SalesLine.objects.filter(sales_bill__in=sales_qs)
    lines_agg = trade_sales_lines.aggregate(
        cogs=Sum('cost_of_goods_sold'),
        gross_profit=Sum('gross_profit')
    )
    tot_cogs = lines_agg['cogs'] or Decimal('0.00')
    gross_trade_profit = lines_agg['gross_profit'] or (tot_revenue - tot_cogs)

    # Selling expenses
    total_selling_expenses = tot_sell_transport + tot_sell_packaging + tot_sell_other
    net_trade_profit = gross_trade_profit - total_selling_expenses
    profit_margin_pct = "0.0"
    if tot_revenue > Decimal('0.00'):
        profit_margin_pct = str(round((net_trade_profit / tot_revenue) * 100, 2))

    summary = {
        "total_procurement_cost": str(tot_procure),
        "total_landed_cost": str(tot_landed),
        "total_trade_sales_revenue": str(tot_revenue),
        "total_cogs": str(tot_cogs),
        "gross_trade_profit": str(gross_trade_profit),
        "total_selling_expenses": str(total_selling_expenses),
        "total_transport_costs": str(tot_pur_transport + tot_sell_transport),
        "total_packaging_costs": str(tot_pur_packaging + tot_sell_packaging),
        "other_attributable_expenses": str(tot_pur_other + tot_sell_other),
        "net_trade_profit": str(net_trade_profit),
        "profit_margin_pct": profit_margin_pct,
        "total_paid_to_vendors": str(tot_paid_vendors),
        "total_received_from_customers": str(tot_received_customers),
        "outstanding_vendor_payables": str(outstanding_vendor_payables),
        "outstanding_customer_receivables": str(outstanding_customer_receivables)
    }

    # Paginate trade sales transactions
    paginated_sales = paginate_queryset(sales_qs, request)
    trade_sales_data = [{
        "id": s.id,
        "bill_number": s.bill_number,
        "customer": s.customer.customer_name,
        "bill_date": s.bill_date,
        "grand_total": str(s.grand_total),
        "amount_paid": str(s.amount_paid),
        "remaining_balance": str(s.remaining_balance),
        "payment_status": s.payment_status,
        "transport_cost": str(s.transport_cost),
        "packaging_cost": str(s.packaging_cost),
        "other_selling_expenses": str(s.other_selling_expenses),
        "status": s.status,
        "lines": [{
            "item_name": l.item.name,
            "quantity": str(l.quantity),
            "unit": l.item.unit.short_name,
            "selling_rate": str(l.selling_rate),
            "lot_cost": str(l.inventory_lot.unit_cost),
            "revenue": str(l.revenue),
            "cogs": str(l.cost_of_goods_sold),
            "gross_profit": str(l.gross_profit)
        } for l in s.lines.all()]
    } for s in paginated_sales['items']]

    return json_success({
        "summary": summary,
        "trade_sales": trade_sales_data,
        "pagination": paginated_sales['pagination']
    })
