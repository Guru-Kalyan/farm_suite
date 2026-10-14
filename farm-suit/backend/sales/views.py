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
from .models import SalesBill, SalesPayment
from .services.billing_service import save_sales_bill, post_sales_bill, reverse_sales_bill, record_sales_payment
from .services.bill_pdf_service import generate_sales_bill_pdf

@require_http_methods(["GET", "POST"])
@api_login_required
def sales_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        customer_id = request.GET.get("customer_id", "").strip()
        status = request.GET.get("status", "").strip().upper()
        payment_status = request.GET.get("payment_status", "").strip().upper()
        sale_type = request.GET.get("sale_type", "").strip().upper()
        from_date = request.GET.get("from_date", "").strip()
        to_date = request.GET.get("to_date", "").strip()
        date_preset = request.GET.get("date_preset", "").strip().lower()
        month = request.GET.get("month", "").strip()
        year = request.GET.get("year", "").strip()
        item_id = request.GET.get("item_id", "").strip()
        payment_method = request.GET.get("payment_method", "").strip().upper()

        qs = SalesBill.objects.select_related('customer', 'created_by').all()

        if search:
            qs = qs.filter(
                Q(bill_number__icontains=search) |
                Q(customer__customer_name__icontains=search) |
                Q(customer__customer_code__icontains=search)
            )
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if status in ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'):
            qs = qs.filter(status=status)
        if payment_status in ('UNPAID', 'PARTIALLY_PAID', 'PAID'):
            qs = qs.filter(payment_status=payment_status)
        if sale_type in ('REGULAR', 'TRADE'):
            qs = qs.filter(sale_type=sale_type)

        # Date preset filtering
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
        # Posted bills totals
        posted_qs = qs.filter(status='POSTED')
        totals = posted_qs.aggregate(
            total_sales=Sum('grand_total'),
            total_received=Sum('amount_paid')
        )
        tot_sales = totals['total_sales'] or Decimal('0.00')
        tot_recv = totals['total_received'] or Decimal('0.00')
        tot_out = max(Decimal('0.00'), tot_sales - tot_recv)

        status_counts = qs.aggregate(
            paid=Count('id', filter=Q(payment_status='PAID')),
            partially_paid=Count('id', filter=Q(payment_status='PARTIALLY_PAID')),
            unpaid=Count('id', filter=Q(payment_status='UNPAID')),
            total_count=Count('id')
        )

        summary = {
            "total_sales": str(tot_sales),
            "total_received": str(tot_recv),
            "total_outstanding": str(tot_out),
            "total_bills": status_counts['total_count'] or 0,
            "paid_bills": status_counts['paid'] or 0,
            "partially_paid_bills": status_counts['partially_paid'] or 0,
            "unpaid_bills": status_counts['unpaid'] or 0,
        }

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": b.id,
            "bill_number": b.bill_number,
            "sale_type": b.sale_type,
            "customer": {
                "id": b.customer.id,
                "customer_name": b.customer.customer_name,
                "customer_code": b.customer.customer_code,
                "phone": b.customer.phone
            },
            "bill_date": b.bill_date,
            "subtotal": str(b.subtotal),
            "tax_amount": str(b.tax_amount),
            "discount": str(b.discount),
            "grand_total": str(b.grand_total),
            "transport_cost": str(b.transport_cost),
            "packaging_cost": str(b.packaging_cost),
            "other_selling_expenses": str(b.other_selling_expenses),
            "amount_paid": str(b.amount_paid),
            "remaining_balance": str(b.remaining_balance),
            "payment_status": b.payment_status,
            "status": b.status,
            "created_by": b.created_by.username if b.created_by else "",
            "lines_count": b.lines.count(),
            "payments_count": b.payments.count(),
            "created_at": b.created_at
        } for b in paginated['items']]

        return json_success({
            "sales": data,
            "summary": summary,
            "pagination": paginated['pagination']
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            bill = save_sales_bill(data, request.user)
            return json_success({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "sale_type": bill.sale_type,
                "grand_total": str(bill.grand_total),
                "amount_paid": str(bill.amount_paid),
                "remaining_balance": str(bill.remaining_balance),
                "payment_status": bill.payment_status,
                "status": bill.status
            }, message="Sales bill draft created successfully", status=201)
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["GET", "PUT"])
@api_login_required
def sales_detail_view(request, pk):
    try:
        bill = SalesBill.objects.select_related('customer', 'created_by').prefetch_related(
            'lines__item', 'lines__item__unit', 'lines__inventory_lot', 'payments__recorded_by'
        ).get(pk=pk)
    except SalesBill.DoesNotExist:
        return json_error("Sales bill not found", status=404)

    if request.method == "GET":
        lines_data = []
        total_cogs = 0
        total_gross_profit = 0

        for line in bill.lines.all():
            total_cogs += line.cost_of_goods_sold
            total_gross_profit += line.gross_profit

            lines_data.append({
                "id": line.id,
                "item": {
                    "id": line.item.id,
                    "name": line.item.name,
                    "item_code": line.item.item_code,
                    "unit": line.item.unit.short_name
                },
                "lot": {
                    "id": line.inventory_lot.id,
                    "lot_number": line.inventory_lot.lot_number,
                    "source_type": line.inventory_lot.source_type,
                    "lot_unit_cost": str(line.inventory_lot.unit_cost)
                },
                "quantity": str(line.quantity),
                "selling_rate": str(line.selling_rate),
                "revenue": str(line.revenue),
                "cost_of_goods_sold": str(line.cost_of_goods_sold),
                "gross_profit": str(line.gross_profit)
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

        # Net Trade Profit if trade sale
        selling_expenses = bill.transport_cost + bill.packaging_cost + bill.other_selling_expenses
        net_trade_profit = total_gross_profit - selling_expenses
        revenue_val = bill.subtotal
        trade_margin_pct = "0.0"
        if revenue_val > Decimal('0.00'):
            trade_margin_pct = str(round((net_trade_profit / revenue_val) * 100, 2))

        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "sale_type": bill.sale_type,
            "customer": {
                "id": bill.customer.id,
                "customer_name": bill.customer.customer_name,
                "customer_code": bill.customer.customer_code,
                "phone": bill.customer.phone,
                "address": bill.customer.address,
                "gst_number": bill.customer.gst_number
            },
            "bill_date": bill.bill_date,
            "subtotal": str(bill.subtotal),
            "tax_amount": str(bill.tax_amount),
            "discount": str(bill.discount),
            "grand_total": str(bill.grand_total),
            "transport_cost": str(bill.transport_cost),
            "packaging_cost": str(bill.packaging_cost),
            "other_selling_expenses": str(bill.other_selling_expenses),
            "selling_expenses": str(selling_expenses),
            "total_cogs": str(total_cogs),
            "total_gross_profit": str(total_gross_profit),
            "net_trade_profit": str(net_trade_profit),
            "trade_margin_pct": trade_margin_pct,
            "amount_paid": str(bill.amount_paid),
            "remaining_balance": str(bill.remaining_balance),
            "payment_status": bill.payment_status,
            "status": bill.status,
            "remarks": bill.remarks,
            "created_by": bill.created_by.username if bill.created_by else "",
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
            bill = save_sales_bill(data, request.user, bill_id=pk)
            return json_success({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "sale_type": bill.sale_type,
                "grand_total": str(bill.grand_total),
                "status": bill.status
            }, message="Sales bill draft updated successfully")
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["POST"])
@api_login_required
def post_sales_view(request, pk):
    data = parse_json_body(request)
    items_data = data.get("items", []) if data else []

    try:
        bill = post_sales_bill(pk, items_data, request.user)
        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "grand_total": str(bill.grand_total),
            "payment_status": bill.payment_status,
            "amount_paid": str(bill.amount_paid),
            "remaining_balance": str(bill.remaining_balance),
            "status": bill.status
        }, message=f"Sales bill {bill.bill_number} posted successfully. Stock consumed via FIFO.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["POST"])
@api_login_required
def reverse_sales_view(request, pk):
    data = parse_json_body(request)
    reason = data.get("reason", "") if data else ""

    try:
        bill = reverse_sales_bill(pk, request.user, reason)
        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "status": bill.status
        }, message=f"Sales bill {bill.bill_number} reversed successfully. Inventory restored.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["GET", "POST"])
@api_login_required
def sales_payments_view(request, pk):
    """
    GET /api/sales/<pk>/payments/ -> List payments for this bill
    POST /api/sales/<pk>/payments/ -> Record a new payment for this bill
    """
    try:
        bill = SalesBill.objects.get(pk=pk)
    except SalesBill.DoesNotExist:
        return json_error("Sales bill not found", status=404)

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
            payment, updated_bill = record_sales_payment(pk, data, request.user)
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
            }, message=f"Payment of ₹{payment.amount} recorded successfully. Remaining balance: ₹{updated_bill.remaining_balance}", status=201)
        except ValidationError as e:
            msg = e.message_dict if hasattr(e, 'message_dict') else (e.messages[0] if hasattr(e, 'messages') else str(e))
            return json_error(message="Payment recording failed", errors=msg, status=400)

@require_http_methods(["GET"])
@api_login_required
def all_sales_payments_view(request):
    """
    GET /api/sales/payments/ -> List all sales payments received
    """
    customer_id = request.GET.get("customer_id", "").strip()
    from_date = request.GET.get("from_date", "").strip()
    to_date = request.GET.get("to_date", "").strip()
    payment_method = request.GET.get("payment_method", "").strip().upper()
    search = request.GET.get("search", "").strip()

    qs = SalesPayment.objects.select_related('sales_bill', 'customer', 'recorded_by').all()

    if search:
        qs = qs.filter(
            Q(sales_bill__bill_number__icontains=search) |
            Q(customer__customer_name__icontains=search) |
            Q(reference_number__icontains=search)
        )
    if customer_id:
        qs = qs.filter(customer_id=customer_id)
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
        "sales_bill": {
            "id": p.sales_bill.id,
            "bill_number": p.sales_bill.bill_number,
            "grand_total": str(p.sales_bill.grand_total),
            "payment_status": p.sales_bill.payment_status,
            "sale_type": p.sales_bill.sale_type
        },
        "customer": {
            "id": p.customer.id,
            "customer_name": p.customer.customer_name,
            "customer_code": p.customer.customer_code
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
def download_sales_pdf_view(request, pk):
    """
    Mandatory PDF generation endpoint:
    GET /api/sales/<id>/pdf/
    Returns application/pdf attachment named FarmSuit_SalesBill_<bill_number>.pdf
    """
    try:
        bill = SalesBill.objects.select_related('customer', 'created_by').prefetch_related(
            'lines__item', 'lines__item__unit', 'lines__inventory_lot'
        ).get(pk=pk)
    except SalesBill.DoesNotExist:
        return json_error("Sales bill not found", status=404)

    try:
        pdf_bytes = generate_sales_bill_pdf(bill)
        filename = f"FarmSuit_SalesBill_{bill.bill_number}.pdf"

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Filename'] = filename
        return response
    except Exception as e:
        return json_error(f"Failed to generate bill PDF: {str(e)}", status=500)
