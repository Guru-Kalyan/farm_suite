from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Sum
from sales.models import SalesBill, SalesLine
from inventory.models import InventoryLot, StockMovement
from audit.services.audit_service import record_audit
from masters.models import Customer, Item

@transaction.atomic
def save_sales_bill(data, user, bill_id=None):
    """
    Creates or updates a DRAFT sales bill.
    Note: Draft bills validate structure and compute previews, but DO NOT reserve/consume stock.
    Stock consumption only occurs when POSTED.
    """
    customer_id = data.get("customer_id")
    bill_number = data.get("bill_number", "").strip().upper()
    bill_date = data.get("bill_date")
    remarks = data.get("remarks", "").strip()
    items_data = data.get("items", [])

    if not customer_id:
        raise ValidationError({"customer_id": ["Customer is required"]})
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        raise ValidationError({"customer_id": ["Customer does not exist"]})

    if not bill_number:
        raise ValidationError({"bill_number": ["Bill number is required"]})

    if bill_id:
        try:
            bill = SalesBill.objects.get(pk=bill_id)
        except SalesBill.DoesNotExist:
            raise ValidationError("Sales bill not found")
        if bill.status != 'DRAFT':
            raise ValidationError("Only DRAFT sales bills can be modified")
        if SalesBill.objects.filter(bill_number=bill_number).exclude(pk=bill_id).exists():
            raise ValidationError({"bill_number": ["Bill number already exists"]})
    else:
        if SalesBill.objects.filter(bill_number=bill_number).exists():
            raise ValidationError({"bill_number": ["Bill number already exists"]})
        bill = SalesBill(created_by=user)

    if not items_data:
        raise ValidationError({"items": ["At least one item is required in the sales bill"]})

    try:
        tax_amount = Decimal(str(data.get("tax_amount", "0.00")))
        discount = Decimal(str(data.get("discount", "0.00")))
        if tax_amount < 0 or discount < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Tax and discount must be non-negative decimals")

    # Compute preview subtotal
    subtotal = Decimal('0.00')
    for idx, it in enumerate(items_data):
        item_id = it.get("item_id")
        try:
            qty = Decimal(str(it.get("quantity", "0")))
            rate = Decimal(str(it.get("selling_rate", "0")))
            if qty <= 0 or rate < 0:
                raise ValueError
        except (ValueError, TypeError):
            raise ValidationError({f"items[{idx}]": ["Quantity must be > 0 and selling rate must be >= 0"]})
        subtotal += (qty * rate).quantize(Decimal('0.01'))

    grand_total = (subtotal + tax_amount - discount).quantize(Decimal('0.01'))
    if grand_total < Decimal('0.00'):
        grand_total = Decimal('0.00')

    bill.customer = customer
    bill.bill_number = bill_number
    bill.bill_date = bill_date
    bill.tax_amount = tax_amount
    bill.discount = discount
    bill.subtotal = subtotal
    bill.grand_total = grand_total
    bill.remarks = remarks
    bill.save()

    record_audit(
        user=user,
        model_name="SalesBill",
        object_id=bill.id,
        action="UPDATE" if bill_id else "CREATE",
        new_values={
            "bill_number": bill.bill_number,
            "customer": customer.customer_name,
            "grand_total": str(bill.grand_total),
            "status": bill.status
        },
        description=f"{'Updated' if bill_id else 'Created'} Draft Sales Bill {bill.bill_number}"
    )

    return bill

@transaction.atomic
def post_sales_bill(bill_id, items_data, user):
    """
    Executes authoritative atomic posting of a sales bill:
    1. Validates available stock for each requested item
    2. Performs FIFO allocation across available lots using select_for_update()
    3. Decrements available_quantity and sets DEPLETED if 0
    4. Creates StockMovement('SALE') for each lot consumed
    5. Calculates line Revenue, COGS, and Gross Profit
    6. Creates SalesLine records
    7. Updates SalesBill totals and sets status = 'POSTED'
    """
    try:
        bill = SalesBill.objects.select_for_update().get(pk=bill_id)
    except SalesBill.DoesNotExist:
        raise ValidationError("Sales bill not found")

    if bill.status != 'DRAFT':
        raise ValidationError(f"Cannot post sales bill in status '{bill.status}'")

    if not items_data:
        raise ValidationError("No items provided for sales bill posting")

    # Clear any previous preview lines if present
    bill.lines.all().delete()

    subtotal = Decimal('0.00')
    total_cogs = Decimal('0.00')
    created_lines = []

    for it in items_data:
        item_id = it.get("item_id")
        try:
            item = Item.objects.get(pk=item_id)
        except Item.DoesNotExist:
            raise ValidationError(f"Item with id {item_id} does not exist")

        try:
            qty_needed = Decimal(str(it.get("quantity", "0")))
            selling_rate = Decimal(str(it.get("selling_rate", "0")))
            if qty_needed <= 0 or selling_rate < 0:
                raise ValueError
        except (ValueError, TypeError):
            raise ValidationError(f"Invalid quantity or selling rate for item {item.name}")

        # Check total available stock
        available_lots = InventoryLot.objects.select_for_update().filter(
            item=item,
            status='AVAILABLE',
            available_quantity__gt=0
        ).order_by('received_date', 'id')

        total_avail = available_lots.aggregate(total=Sum('available_quantity'))['total'] or Decimal('0.000')

        if total_avail < qty_needed:
            raise ValidationError(
                f"Insufficient stock for {item.name}. Requested: {qty_needed} {item.unit.short_name}, Available: {total_avail} {item.unit.short_name}."
            )

        # FIFO consumption
        qty_remaining = qty_needed
        for lot in available_lots:
            if qty_remaining <= Decimal('0.000'):
                break

            qty_from_lot = min(lot.available_quantity, qty_remaining)
            lot.available_quantity -= qty_from_lot
            if lot.available_quantity == Decimal('0.000'):
                lot.status = 'DEPLETED'
            lot.save()

            line_revenue = (qty_from_lot * selling_rate).quantize(Decimal('0.01'))
            line_cogs = (qty_from_lot * lot.unit_cost).quantize(Decimal('0.01'))
            line_profit = line_revenue - line_cogs

            subtotal += line_revenue
            total_cogs += line_cogs

            # Record stock movement
            StockMovement.objects.create(
                inventory_lot=lot,
                movement_type='SALE',
                quantity=qty_from_lot,
                reference_type='SALES_BILL',
                reference_id=bill.id,
                created_by=user,
                remarks=f"Sale to {bill.customer.customer_name} via Bill {bill.bill_number}"
            )

            # Record sales line
            sl = SalesLine.objects.create(
                sales_bill=bill,
                item=item,
                inventory_lot=lot,
                quantity=qty_from_lot,
                selling_rate=selling_rate,
                revenue=line_revenue,
                cost_of_goods_sold=line_cogs,
                gross_profit=line_profit
            )
            created_lines.append(sl)

            qty_remaining -= qty_from_lot

    grand_total = (subtotal + bill.tax_amount - bill.discount).quantize(Decimal('0.01'))
    if grand_total < Decimal('0.00'):
        grand_total = Decimal('0.00')

    bill.subtotal = subtotal
    bill.grand_total = grand_total
    bill.status = 'POSTED'
    bill.save()

    total_gross_profit = subtotal - total_cogs

    record_audit(
        user=user,
        model_name="SalesBill",
        object_id=bill.id,
        action="POST",
        new_values={
            "status": "POSTED",
            "bill_number": bill.bill_number,
            "revenue": str(subtotal),
            "cogs": str(total_cogs),
            "gross_profit": str(total_gross_profit)
        },
        description=f"Posted Sales Bill {bill.bill_number}. FIFO consumed. Revenue: ₹{subtotal}, COGS: ₹{total_cogs}, Profit: ₹{total_gross_profit}"
    )

    return bill

@transaction.atomic
def reverse_sales_bill(bill_id, user, reason):
    """
    Reverses a posted sales bill:
    1. Validates status is 'POSTED'
    2. Restores consumed lot quantities and marks lot as AVAILABLE
    3. Creates StockMovement('REVERSAL')
    4. Updates SalesBill status to 'REVERSED'
    5. Records AuditLog
    """
    try:
        bill = SalesBill.objects.select_for_update().get(pk=bill_id)
    except SalesBill.DoesNotExist:
        raise ValidationError("Sales bill not found")

    if bill.status != 'POSTED':
        raise ValidationError(f"Cannot reverse sales bill with status '{bill.status}'")

    if not reason or not reason.strip():
        raise ValidationError("A reversal reason is required")

    lines = bill.lines.select_related('inventory_lot').all()
    for line in lines:
        lot = line.inventory_lot
        lot.available_quantity += line.quantity
        if lot.status == 'DEPLETED':
            lot.status = 'AVAILABLE'
        lot.save()

        StockMovement.objects.create(
            inventory_lot=lot,
            movement_type='REVERSAL',
            quantity=line.quantity,
            reference_type='SALES_BILL',
            reference_id=bill.id,
            created_by=user,
            remarks=f"Reversal of Sales Bill {bill.bill_number}: {reason}"
        )

    bill.status = 'REVERSED'
    bill.remarks = f"{bill.remarks}\n[REVERSED on {bill.updated_at}]: {reason}".strip()
    bill.save()

    record_audit(
        user=user,
        model_name="SalesBill",
        object_id=bill.id,
        action="REVERSE",
        new_values={"status": "REVERSED", "reason": reason},
        description=f"Reversed Sales Bill {bill.bill_number}. Stock restored. Reason: {reason}"
    )

    return bill
