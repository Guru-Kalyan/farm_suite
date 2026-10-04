from django.views.decorators.http import require_http_methods
from django.db.models import Sum, Q
from decimal import Decimal
from utils.response import json_success, json_error
from utils.decorators import api_login_required
from masters.views import paginate_queryset
from sales.models import SalesBill, SalesLine
from trading.models import PurchaseBill
from inventory.models import InventoryLot
from .services.report_service import get_dashboard_kpis, get_profit_report

@require_http_methods(["GET"])
@api_login_required
def dashboard_view(request):
    data = get_dashboard_kpis()
    return json_success(data)

@require_http_methods(["GET"])
@api_login_required
def profit_report_view(request):
    from_date = request.GET.get("from_date", "").strip() or None
    to_date = request.GET.get("to_date", "").strip() or None
    item_id = request.GET.get("item_id", "").strip() or None
    source_type = request.GET.get("source_type", "").strip().upper() or None

    report = get_profit_report(
        from_date=from_date,
        to_date=to_date,
        item_id=item_id,
        source_type=source_type
    )
    return json_success(report)

@require_http_methods(["GET"])
@api_login_required
def sales_report_view(request):
    from_date = request.GET.get("from_date", "").strip()
    to_date = request.GET.get("to_date", "").strip()
    customer_id = request.GET.get("customer_id", "").strip()

    qs = SalesBill.objects.filter(status='POSTED').select_related('customer')
    if from_date:
        qs = qs.filter(bill_date__gte=from_date)
    if to_date:
        qs = qs.filter(bill_date__lte=to_date)
    if customer_id:
        qs = qs.filter(customer_id=customer_id)

    total_sales = qs.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": s.id,
        "bill_number": s.bill_number,
        "customer": s.customer.customer_name,
        "bill_date": s.bill_date,
        "subtotal": str(s.subtotal),
        "tax": str(s.tax_amount),
        "discount": str(s.discount),
        "grand_total": str(s.grand_total)
    } for s in paginated['items']]

    return json_success({
        "sales": data,
        "total_revenue": str(total_sales),
        "pagination": paginated['pagination']
    })

@require_http_methods(["GET"])
@api_login_required
def purchase_report_view(request):
    from_date = request.GET.get("from_date", "").strip()
    to_date = request.GET.get("to_date", "").strip()
    vendor_id = request.GET.get("vendor_id", "").strip()

    qs = PurchaseBill.objects.filter(status='POSTED').select_related('vendor')
    if from_date:
        qs = qs.filter(bill_date__gte=from_date)
    if to_date:
        qs = qs.filter(bill_date__lte=to_date)
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)

    total_purchases = qs.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": b.id,
        "bill_number": b.bill_number,
        "vendor": b.vendor.vendor_name,
        "bill_date": b.bill_date,
        "subtotal": str(b.subtotal),
        "tax": str(b.tax_amount),
        "discount": str(b.discount),
        "grand_total": str(b.grand_total)
    } for b in paginated['items']]

    return json_success({
        "purchases": data,
        "total_expenditure": str(total_purchases),
        "pagination": paginated['pagination']
    })

@require_http_methods(["GET"])
@api_login_required
def inventory_report_view(request):
    source_type = request.GET.get("source_type", "").strip().upper()
    qs = InventoryLot.objects.filter(status='AVAILABLE', available_quantity__gt=0).select_related('item', 'item__unit', 'item__category')
    if source_type in ('PURCHASE', 'HARVEST'):
        qs = qs.filter(source_type=source_type)

    total_qty = qs.aggregate(q=Sum('available_quantity'))['q'] or Decimal('0.000')

    lots_data = [{
        "id": l.id,
        "lot_number": l.lot_number,
        "item_name": l.item.name,
        "category": l.item.category.name,
        "source_type": l.source_type,
        "received_date": l.received_date,
        "available_quantity": str(l.available_quantity),
        "unit": l.item.unit.short_name,
        "unit_cost": str(l.unit_cost),
        "total_valuation": str(l.available_quantity * l.unit_cost)
    } for l in qs]

    total_val = sum(Decimal(it["total_valuation"]) for it in lots_data)

    return json_success({
        "lots": lots_data,
        "total_quantity": str(total_qty),
        "total_valuation": str(total_val)
    })
