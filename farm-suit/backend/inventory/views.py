from django.views.decorators.http import require_http_methods
from django.db.models import Q, Sum, F, DecimalField, ExpressionWrapper
from decimal import Decimal
from utils.response import json_success, json_error
from utils.decorators import api_login_required
from masters.models import Item
from masters.views import paginate_queryset
from .models import InventoryLot, StockMovement

@require_http_methods(["GET"])
@api_login_required
def stock_overview_view(request):
    """
    Returns aggregated stock overview by item with valuation and low-stock indicators.
    """
    search = request.GET.get("search", "").strip()
    category_id = request.GET.get("category", "").strip()
    low_stock_only = request.GET.get("low_stock", "").lower() in ('true', '1')

    items_qs = Item.objects.filter(is_active=True).select_related('category', 'unit')
    if search:
        items_qs = items_qs.filter(Q(name__icontains=search) | Q(item_code__icontains=search))
    if category_id:
        items_qs = items_qs.filter(category_id=category_id)

    items_list = []
    total_inventory_valuation = Decimal('0.00')

    for item in items_qs:
        active_lots = item.inventory_lots.filter(status='AVAILABLE', available_quantity__gt=0)
        
        # Calculate available quantity
        stock_sum = active_lots.aggregate(total_stock=Sum('available_quantity'))['total_stock'] or Decimal('0.000')
        
        # Calculate valuation = sum(available_quantity * unit_cost)
        val_sum = active_lots.annotate(
            lot_val=ExpressionWrapper(F('available_quantity') * F('unit_cost'), output_field=DecimalField(max_digits=14, decimal_places=2))
        ).aggregate(total_val=Sum('lot_val'))['total_val'] or Decimal('0.00')

        total_inventory_valuation += val_sum
        is_low = stock_sum <= item.minimum_stock if item.minimum_stock > 0 else False

        if low_stock_only and not is_low:
            continue

        items_list.append({
            "item_id": item.id,
            "item_code": item.item_code,
            "item_name": item.name,
            "category": item.category.name,
            "unit": item.unit.short_name,
            "minimum_stock": str(item.minimum_stock),
            "available_stock": str(stock_sum),
            "is_low_stock": is_low,
            "valuation": str(val_sum),
            "active_lots_count": active_lots.count(),
            "purchased_stock": str(active_lots.filter(source_type='PURCHASE').aggregate(s=Sum('available_quantity'))['s'] or Decimal('0.000')),
            "harvested_stock": str(active_lots.filter(source_type='HARVEST').aggregate(s=Sum('available_quantity'))['s'] or Decimal('0.000'))
        })

    paginated = paginate_queryset(items_list, request)

    return json_success({
        "inventory": paginated['items'],
        "total_valuation": str(total_inventory_valuation),
        "pagination": paginated['pagination']
    })

@require_http_methods(["GET"])
@api_login_required
def stock_lots_view(request):
    """
    Returns paginated list of inventory lots with source, availability, and unit cost.
    """
    item_id = request.GET.get("item_id", "").strip()
    source_type = request.GET.get("source_type", "").strip().upper()
    status = request.GET.get("status", "").strip().upper()
    search = request.GET.get("search", "").strip()

    qs = InventoryLot.objects.select_related('item', 'item__unit', 'item__category').all()
    if item_id:
        qs = qs.filter(item_id=item_id)
    if source_type in ('PURCHASE', 'HARVEST'):
        qs = qs.filter(source_type=source_type)
    if status in ('AVAILABLE', 'DEPLETED', 'REVERSED'):
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(Q(lot_number__icontains=search) | Q(item__name__icontains=search) | Q(item__item_code__icontains=search))

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": lot.id,
        "lot_number": lot.lot_number,
        "item": {
            "id": lot.item.id,
            "name": lot.item.name,
            "item_code": lot.item.item_code,
            "unit": lot.item.unit.short_name,
            "category": lot.item.category.name
        },
        "source_type": lot.source_type,
        "received_date": lot.received_date,
        "original_quantity": str(lot.original_quantity),
        "available_quantity": str(lot.available_quantity),
        "consumed_quantity": str(lot.original_quantity - lot.available_quantity),
        "unit_cost": str(lot.unit_cost),
        "total_lot_cost": str(lot.original_quantity * lot.unit_cost),
        "status": lot.status,
        "created_at": lot.created_at
    } for lot in paginated['items']]

    return json_success({
        "lots": data,
        "pagination": paginated['pagination']
    })

@require_http_methods(["GET"])
@api_login_required
def lot_detail_view(request, pk):
    """
    Drilldown for an inventory lot showing source details, movements, and sales lines.
    """
    try:
        lot = InventoryLot.objects.select_related('item', 'item__unit', 'item__category', 'purchase_line', 'harvest').get(pk=pk)
    except InventoryLot.DoesNotExist:
        return json_error("Inventory lot not found", status=404)

    movements = lot.stock_movements.select_related('created_by').all()
    movements_data = [{
        "id": m.id,
        "movement_type": m.movement_type,
        "quantity": str(m.quantity),
        "reference_type": m.reference_type,
        "reference_id": m.reference_id,
        "movement_date": m.movement_date,
        "created_by": m.created_by.username,
        "remarks": m.remarks
    } for m in movements]

    sales_lines = lot.sales_lines.select_related('sales_bill', 'sales_bill__customer').all()
    sales_data = [{
        "sales_line_id": sl.id,
        "bill_id": sl.sales_bill.id,
        "bill_number": sl.sales_bill.bill_number,
        "customer": sl.sales_bill.customer.customer_name,
        "bill_date": sl.sales_bill.bill_date,
        "quantity": str(sl.quantity),
        "selling_rate": str(sl.selling_rate),
        "revenue": str(sl.revenue),
        "cogs": str(sl.cost_of_goods_sold),
        "gross_profit": str(sl.gross_profit)
    } for sl in sales_lines]

    source_info = {}
    if lot.source_type == 'PURCHASE' and lot.purchase_line:
        pb = lot.purchase_line.purchase_bill
        source_info = {
            "bill_id": pb.id,
            "bill_number": pb.bill_number,
            "vendor_name": pb.vendor.vendor_name,
            "bill_date": pb.bill_date,
            "received_date": pb.received_date
        }
    elif lot.source_type == 'HARVEST' and lot.harvest:
        h = lot.harvest
        source_info = {
            "harvest_id": h.id,
            "harvest_number": h.harvest_number,
            "batch_number": h.cultivation_batch.batch_number,
            "farm_plot": h.cultivation_batch.farm_plot.name,
            "harvest_date": h.harvest_date,
            "quality_grade": h.quality_grade
        }

    return json_success({
        "id": lot.id,
        "lot_number": lot.lot_number,
        "item": {
            "id": lot.item.id,
            "name": lot.item.name,
            "item_code": lot.item.item_code,
            "unit": lot.item.unit.short_name
        },
        "source_type": lot.source_type,
        "source_info": source_info,
        "received_date": lot.received_date,
        "original_quantity": str(lot.original_quantity),
        "available_quantity": str(lot.available_quantity),
        "unit_cost": str(lot.unit_cost),
        "status": lot.status,
        "created_at": lot.created_at,
        "movements": movements_data,
        "sales_consuming_lot": sales_data
    })

@require_http_methods(["GET"])
@api_login_required
def stock_movements_view(request):
    """
    Returns global chronological stock movements ledger.
    """
    lot_id = request.GET.get("lot_id", "").strip()
    movement_type = request.GET.get("movement_type", "").strip().upper()
    search = request.GET.get("search", "").strip()

    qs = StockMovement.objects.select_related('inventory_lot', 'inventory_lot__item', 'inventory_lot__item__unit', 'created_by').all()
    if lot_id:
        qs = qs.filter(inventory_lot_id=lot_id)
    if movement_type:
        qs = qs.filter(movement_type=movement_type)
    if search:
        qs = qs.filter(
            Q(inventory_lot__lot_number__icontains=search) |
            Q(inventory_lot__item__name__icontains=search) |
            Q(reference_type__icontains=search) |
            Q(remarks__icontains=search)
        )

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": m.id,
        "lot_number": m.inventory_lot.lot_number,
        "item_name": m.inventory_lot.item.name,
        "unit": m.inventory_lot.item.unit.short_name,
        "movement_type": m.movement_type,
        "quantity": str(m.quantity),
        "reference_type": m.reference_type,
        "reference_id": m.reference_id,
        "movement_date": m.movement_date,
        "created_by": m.created_by.username,
        "remarks": m.remarks
    } for m in paginated['items']]

    return json_success({
        "movements": data,
        "pagination": paginated['pagination']
    })
