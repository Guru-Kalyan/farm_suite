from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import HttpResponse
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from masters.views import paginate_queryset
from .models import SalesBill
from .services.billing_service import save_sales_bill, post_sales_bill, reverse_sales_bill
from .services.bill_pdf_service import generate_sales_bill_pdf

@require_http_methods(["GET", "POST"])
@api_login_required
def sales_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        customer_id = request.GET.get("customer_id", "").strip()
        status = request.GET.get("status", "").strip().upper()
        from_date = request.GET.get("from_date", "").strip()
        to_date = request.GET.get("to_date", "").strip()

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
        if from_date:
            qs = qs.filter(bill_date__gte=from_date)
        if to_date:
            qs = qs.filter(bill_date__lte=to_date)

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": b.id,
            "bill_number": b.bill_number,
            "customer": {
                "id": b.customer.id,
                "customer_name": b.customer.customer_name,
                "customer_code": b.customer.customer_code
            },
            "bill_date": b.bill_date,
            "subtotal": str(b.subtotal),
            "tax_amount": str(b.tax_amount),
            "discount": str(b.discount),
            "grand_total": str(b.grand_total),
            "status": b.status,
            "created_by": b.created_by.username if b.created_by else "",
            "lines_count": b.lines.count(),
            "created_at": b.created_at
        } for b in paginated['items']]

        return json_success({"sales": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            bill = save_sales_bill(data, request.user)
            return json_success({
                "id": bill.id,
                "bill_number": bill.bill_number,
                "grand_total": str(bill.grand_total),
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
            'lines__item', 'lines__item__unit', 'lines__inventory_lot'
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

        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
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
            "total_cogs": str(total_cogs),
            "total_gross_profit": str(total_gross_profit),
            "status": bill.status,
            "remarks": bill.remarks,
            "created_by": bill.created_by.username if bill.created_by else "",
            "lines": lines_data,
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
