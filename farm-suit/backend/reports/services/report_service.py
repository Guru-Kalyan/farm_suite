from django.utils import timezone
from django.db.models import Sum, F, DecimalField, ExpressionWrapper, Count
from decimal import Decimal
import datetime
from sales.models import SalesBill, SalesLine
from trading.models import PurchaseBill
from inventory.models import InventoryLot
from farming.models import Harvest
from masters.models import Item

def get_dashboard_kpis():
    """
    Computes real-time KPI metrics and visualization trends for the dashboard.
    """
    now = timezone.now()
    today = now.date()
    month_start = today.replace(day=1)

    # 1. Total Stock & Inventory Valuation
    active_lots = InventoryLot.objects.filter(status='AVAILABLE', available_quantity__gt=0)
    stock_sum = active_lots.aggregate(total_stock=Sum('available_quantity'))['total_stock'] or Decimal('0.000')
    
    val_sum = active_lots.annotate(
        lot_val=ExpressionWrapper(F('available_quantity') * F('unit_cost'), output_field=DecimalField(max_digits=14, decimal_places=2))
    ).aggregate(total_val=Sum('lot_val'))['total_val'] or Decimal('0.00')

    # Purchased vs Farm Produced Stock
    purchased_stock = active_lots.filter(source_type='PURCHASE').aggregate(s=Sum('available_quantity'))['s'] or Decimal('0.000')
    farm_stock = active_lots.filter(source_type='HARVEST').aggregate(s=Sum('available_quantity'))['s'] or Decimal('0.000')

    # 2. Purchases Today & Total
    posted_purchases = PurchaseBill.objects.filter(status='POSTED')
    purchases_today = posted_purchases.filter(bill_date=today).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
    purchases_month = posted_purchases.filter(bill_date__gte=month_start).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

    # 3. Sales & Profit Today & Month
    posted_sales = SalesBill.objects.filter(status='POSTED')
    sales_today = posted_sales.filter(bill_date=today).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
    sales_month = posted_sales.filter(bill_date__gte=month_start).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

    posted_lines = SalesLine.objects.filter(sales_bill__status='POSTED')
    profit_today = posted_lines.filter(sales_bill__bill_date=today).aggregate(total=Sum('gross_profit'))['total'] or Decimal('0.00')
    profit_month = posted_lines.filter(sales_bill__bill_date__gte=month_start).aggregate(total=Sum('gross_profit'))['total'] or Decimal('0.00')

    # 4. Low stock items
    low_stock_items = []
    for it in Item.objects.filter(is_active=True).select_related('unit', 'category'):
        avail = it.inventory_lots.filter(status='AVAILABLE').aggregate(s=Sum('available_quantity'))['s'] or Decimal('0.000')
        if it.minimum_stock > 0 and avail <= it.minimum_stock:
            low_stock_items.append({
                "id": it.id,
                "item_code": it.item_code,
                "name": it.name,
                "unit": it.unit.short_name,
                "category": it.category.name,
                "available": str(avail),
                "minimum": str(it.minimum_stock)
            })

    # 5. Last 7 Days Sales & Profit Trend
    trends = []
    for i in range(6, -1, -1):
        day_date = today - datetime.timedelta(days=i)
        day_sales = posted_sales.filter(bill_date=day_date).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        day_profit = posted_lines.filter(sales_bill__bill_date=day_date).aggregate(total=Sum('gross_profit'))['total'] or Decimal('0.00')
        trends.append({
            "date": day_date.strftime('%d %b'),
            "sales": str(day_sales),
            "profit": str(day_profit)
        })

    # 6. Recent Activities
    recent_purchases = [{
        "id": b.id,
        "bill_number": b.bill_number,
        "vendor": b.vendor.vendor_name,
        "bill_date": b.bill_date,
        "total": str(b.grand_total),
        "status": b.status
    } for b in PurchaseBill.objects.select_related('vendor').order_by('-id')[:5]]

    recent_sales = [{
        "id": s.id,
        "bill_number": s.bill_number,
        "customer": s.customer.customer_name,
        "bill_date": s.bill_date,
        "total": str(s.grand_total),
        "status": s.status
    } for s in SalesBill.objects.select_related('customer').order_by('-id')[:5]]

    recent_harvests = [{
        "id": h.id,
        "harvest_number": h.harvest_number,
        "crop": h.cultivation_batch.item.name,
        "plot": h.cultivation_batch.farm_plot.name,
        "quantity": str(h.quantity),
        "unit": h.cultivation_batch.item.unit.short_name,
        "status": h.status
    } for h in Harvest.objects.select_related('cultivation_batch__item__unit', 'cultivation_batch__farm_plot').order_by('-id')[:5]]

    return {
        "kpis": {
            "total_stock": str(stock_sum),
            "inventory_valuation": str(val_sum),
            "purchased_stock": str(purchased_stock),
            "farm_produced_stock": str(farm_stock),
            "today_purchases": str(purchases_today),
            "today_sales": str(sales_today),
            "today_profit": str(profit_today),
            "monthly_purchases": str(purchases_month),
            "monthly_sales": str(sales_month),
            "monthly_profit": str(profit_month)
        },
        "trends": trends,
        "low_stock_items": low_stock_items[:10],
        "recent_purchases": recent_purchases,
        "recent_sales": recent_sales,
        "recent_harvests": recent_harvests
    }

def get_profit_report(from_date=None, to_date=None, item_id=None, source_type=None):
    """
    Derives real-time multi-dimensional profitability from posted SalesLines.
    """
    qs = SalesLine.objects.filter(sales_bill__status='POSTED').select_related(
        'sales_bill', 'sales_bill__customer', 'item', 'item__unit', 'item__category', 'inventory_lot'
    )

    if from_date:
        qs = qs.filter(sales_bill__bill_date__gte=from_date)
    if to_date:
        qs = qs.filter(sales_bill__bill_date__lte=to_date)
    if item_id:
        qs = qs.filter(item_id=item_id)
    if source_type in ('PURCHASE', 'HARVEST'):
        qs = qs.filter(inventory_lot__source_type=source_type)

    total_rev = Decimal('0.00')
    total_cogs = Decimal('0.00')
    total_profit = Decimal('0.00')

    # Item Breakdown
    item_map = {}
    # Channel Breakdown (Purchased vs Farm Produced)
    channel_map = {
        'PURCHASE': {'source': 'Purchased Goods', 'revenue': Decimal('0.00'), 'cogs': Decimal('0.00'), 'profit': Decimal('0.00')},
        'HARVEST': {'source': 'Farm Produced', 'revenue': Decimal('0.00'), 'cogs': Decimal('0.00'), 'profit': Decimal('0.00')},
    }

    # Line details list
    lines_list = []

    for line in qs:
        rev = line.revenue
        cogs = line.cost_of_goods_sold
        profit = line.gross_profit

        total_rev += rev
        total_cogs += cogs
        total_profit += profit

        # Update channel map
        stype = line.inventory_lot.source_type
        if stype in channel_map:
            channel_map[stype]['revenue'] += rev
            channel_map[stype]['cogs'] += cogs
            channel_map[stype]['profit'] += profit

        # Update item map
        iid = line.item.id
        if iid not in item_map:
            item_map[iid] = {
                "item_id": iid,
                "item_name": line.item.name,
                "category": line.item.category.name,
                "unit": line.item.unit.short_name,
                "quantity": Decimal('0.000'),
                "revenue": Decimal('0.00'),
                "cogs": Decimal('0.00'),
                "profit": Decimal('0.00')
            }
        item_map[iid]['quantity'] += line.quantity
        item_map[iid]['revenue'] += rev
        item_map[iid]['cogs'] += cogs
        item_map[iid]['profit'] += profit

        lines_list.append({
            "line_id": line.id,
            "bill_number": line.sales_bill.bill_number,
            "bill_date": line.sales_bill.bill_date,
            "customer": line.sales_bill.customer.customer_name,
            "item_name": line.item.name,
            "lot_number": line.inventory_lot.lot_number,
            "source_type": line.inventory_lot.source_type,
            "quantity": str(line.quantity),
            "unit": line.item.unit.short_name,
            "selling_rate": str(line.selling_rate),
            "lot_cost": str(line.inventory_lot.unit_cost),
            "revenue": str(rev),
            "cogs": str(cogs),
            "gross_profit": str(profit),
            "margin_pct": f"{((profit / rev) * 100):.1f}%" if rev > 0 else "0.0%"
        })

    margin_overall = f"{((total_profit / total_rev) * 100):.1f}%" if total_rev > 0 else "0.0%"

    return {
        "summary": {
            "total_revenue": str(total_rev),
            "total_cogs": str(total_cogs),
            "total_gross_profit": str(total_profit),
            "margin_percentage": margin_overall,
            "total_sales_count": qs.values('sales_bill').distinct().count()
        },
        "by_channel": [
            {
                "channel": v['source'],
                "source_type": k,
                "revenue": str(v['revenue']),
                "cogs": str(v['cogs']),
                "profit": str(v['profit']),
                "margin_pct": f"{((v['profit'] / v['revenue']) * 100):.1f}%" if v['revenue'] > 0 else "0.0%"
            } for k, v in channel_map.items()
        ],
        "by_item": [
            {
                "item_id": v['item_id'],
                "item_name": v['item_name'],
                "category": v['category'],
                "total_quantity": str(v['quantity']),
                "unit": v['unit'],
                "revenue": str(v['revenue']),
                "cogs": str(v['cogs']),
                "profit": str(v['profit']),
                "margin_pct": f"{((v['profit'] / v['revenue']) * 100):.1f}%" if v['revenue'] > 0 else "0.0%"
            } for v in item_map.values()
        ],
        "details": lines_list
    }
