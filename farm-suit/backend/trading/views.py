from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db.models import Q
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from masters.views import paginate_queryset
from .models import PurchaseBill
from .services.purchase_service import save_purchase_bill, post_purchase_bill, reverse_purchase_bill

@require_http_methods(["GET", "POST"])
@api_login_required
def purchases_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        vendor_id = request.GET.get("vendor_id", "").strip()
        status = request.GET.get("status", "").strip().upper()
        from_date = request.GET.get("from_date", "").strip()
        to_date = request.GET.get("to_date", "").strip()

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
        if from_date:
            qs = qs.filter(bill_date__gte=from_date)
        if to_date:
            qs = qs.filter(bill_date__lte=to_date)

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": b.id,
            "bill_number": b.bill_number,
            "vendor": {
                "id": b.vendor.id,
                "vendor_name": b.vendor.vendor_name,
                "vendor_code": b.vendor.vendor_code
            },
            "bill_date": b.bill_date,
            "received_date": b.received_date,
            "accepted_by": b.accepted_by.username if b.accepted_by else "",
            "subtotal": str(b.subtotal),
            "tax_amount": str(b.tax_amount),
            "discount": str(b.discount),
            "grand_total": str(b.grand_total),
            "status": b.status,
            "remarks": b.remarks,
            "lines_count": b.lines.count(),
            "created_at": b.created_at
        } for b in paginated['items']]

        return json_success({"purchases": data, "pagination": paginated['pagination']})

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
        bill = PurchaseBill.objects.select_related('vendor', 'accepted_by').prefetch_related('lines__item', 'lines__item__unit', 'lines__inventory_lots').get(pk=pk)
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
                "remarks": line.remarks,
                "lots": lots_data
            })

        return json_success({
            "id": bill.id,
            "bill_number": bill.bill_number,
            "vendor": {
                "id": bill.vendor.id,
                "vendor_name": bill.vendor.vendor_name,
                "vendor_code": bill.vendor.vendor_code,
                "phone": bill.vendor.phone,
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
            "status": bill.status,
            "remarks": bill.remarks,
            "lines": lines_data,
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
            "status": bill.status
        }, message=f"Purchase bill {bill.bill_number} posted successfully. Inventory updated.")
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
        }, message=f"Purchase bill {bill.bill_number} reversed successfully.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)
