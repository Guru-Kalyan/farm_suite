from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from trading.models import PurchaseBill, PurchaseLine
from inventory.services.stock_service import create_stock_receipt
from inventory.models import StockMovement
from audit.services.audit_service import record_audit
from masters.models import Item, Vendor

@transaction.atomic
def save_purchase_bill(data, user, bill_id=None):
    """
    Creates or updates a DRAFT purchase bill.
    Calculates subtotal, tax, discount, grand total.
    """
    vendor_id = data.get("vendor_id")
    bill_number = data.get("bill_number", "").strip().upper()
    bill_date = data.get("bill_date")
    received_date = data.get("received_date") or bill_date
    remarks = data.get("remarks", "").strip()
    lines_data = data.get("lines", [])

    if not vendor_id:
        raise ValidationError({"vendor_id": ["Vendor is required"]})
    try:
        vendor = Vendor.objects.get(pk=vendor_id)
    except Vendor.DoesNotExist:
        raise ValidationError({"vendor_id": ["Vendor does not exist"]})

    if not bill_number:
        raise ValidationError({"bill_number": ["Bill number is required"]})

    if bill_id:
        try:
            bill = PurchaseBill.objects.get(pk=bill_id)
        except PurchaseBill.DoesNotExist:
            raise ValidationError("Purchase bill not found")
        if bill.status != 'DRAFT':
            raise ValidationError("Only DRAFT purchase bills can be modified")
        if PurchaseBill.objects.filter(bill_number=bill_number).exclude(pk=bill_id).exists():
            raise ValidationError({"bill_number": ["Bill number already exists"]})
    else:
        if PurchaseBill.objects.filter(bill_number=bill_number).exists():
            raise ValidationError({"bill_number": ["Bill number already exists"]})
        bill = PurchaseBill()

    if not lines_data:
        raise ValidationError({"lines": ["At least one purchase line item is required"]})

    try:
        tax_amount = Decimal(str(data.get("tax_amount", "0.00")))
        discount = Decimal(str(data.get("discount", "0.00")))
        if tax_amount < 0 or discount < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Tax and discount must be non-negative decimals")

    bill.vendor = vendor
    bill.bill_number = bill_number
    bill.bill_date = bill_date
    bill.received_date = received_date
    bill.accepted_by = user
    bill.tax_amount = tax_amount
    bill.discount = discount
    bill.remarks = remarks
    bill.save()

    # If updating, remove old lines
    if bill_id:
        bill.lines.all().delete()

    subtotal = Decimal('0.00')
    created_lines = []

    for idx, line in enumerate(lines_data):
        item_id = line.get("item_id")
        if not item_id:
            raise ValidationError({f"lines[{idx}].item_id": ["Item is required"]})
        try:
            item = Item.objects.get(pk=item_id)
        except Item.DoesNotExist:
            raise ValidationError({f"lines[{idx}].item_id": ["Item does not exist"]})

        try:
            qty = Decimal(str(line.get("quantity", "0")))
            rate = Decimal(str(line.get("unit_rate", "0")))
            if qty <= 0 or rate < 0:
                raise ValueError
        except (ValueError, TypeError):
            raise ValidationError({f"lines[{idx}]": ["Quantity must be > 0 and unit rate must be >= 0"]})

        line_amount = (qty * rate).quantize(Decimal('0.01'))
        subtotal += line_amount

        pl = PurchaseLine.objects.create(
            purchase_bill=bill,
            item=item,
            quantity=qty,
            unit_rate=rate,
            amount=line_amount,
            remarks=line.get("remarks", "")
        )
        created_lines.append(pl)

    grand_total = (subtotal + tax_amount - discount).quantize(Decimal('0.01'))
    if grand_total < Decimal('0.00'):
        grand_total = Decimal('0.00')

    bill.subtotal = subtotal
    bill.grand_total = grand_total
    bill.save()

    record_audit(
        user=user,
        model_name="PurchaseBill",
        object_id=bill.id,
        action="UPDATE" if bill_id else "CREATE",
        new_values={
            "bill_number": bill.bill_number,
            "vendor": vendor.vendor_name,
            "grand_total": str(bill.grand_total),
            "status": bill.status
        },
        description=f"{'Updated' if bill_id else 'Created'} Draft Purchase Bill {bill.bill_number}"
    )

    return bill

@transaction.atomic
def post_purchase_bill(bill_id, user):
    """
    Finalizes and posts a purchase bill:
    Creates InventoryLot records and StockMovement records.
    """
    try:
        bill = PurchaseBill.objects.select_for_update().get(pk=bill_id)
    except PurchaseBill.DoesNotExist:
        raise ValidationError("Purchase bill not found")

    if bill.status != 'DRAFT':
        raise ValidationError(f"Cannot post purchase bill in status '{bill.status}'")

    lines = bill.lines.select_related('item').all()
    if not lines:
        raise ValidationError("Cannot post an empty purchase bill")

    for line in lines:
        create_stock_receipt(
            item=line.item,
            source_type='PURCHASE',
            quantity=line.quantity,
            unit_cost=line.unit_rate,
            received_date=bill.received_date,
            user=user,
            purchase_line=line,
            reference_type='PURCHASE_BILL',
            reference_id=bill.id,
            remarks=f"Received via Purchase Bill {bill.bill_number}"
        )

    bill.status = 'POSTED'
    bill.save()

    record_audit(
        user=user,
        model_name="PurchaseBill",
        object_id=bill.id,
        action="POST",
        new_values={"status": "POSTED", "bill_number": bill.bill_number},
        description=f"Posted Purchase Bill {bill.bill_number}. Inventory lots generated."
    )

    return bill

@transaction.atomic
def reverse_purchase_bill(bill_id, user, reason):
    """
    Reverses a posted purchase bill.
    Verifies that no inventory lots have been consumed.
    """
    try:
        bill = PurchaseBill.objects.select_for_update().get(pk=bill_id)
    except PurchaseBill.DoesNotExist:
        raise ValidationError("Purchase bill not found")

    if bill.status != 'POSTED':
        raise ValidationError(f"Cannot reverse purchase bill with status '{bill.status}'")

    if not reason or not reason.strip():
        raise ValidationError("A reversal reason is required")

    # Verify inventory integrity
    for line in bill.lines.all():
        for lot in line.inventory_lots.all():
            if lot.available_quantity < lot.original_quantity:
                consumed = lot.original_quantity - lot.available_quantity
                raise ValidationError(
                    f"Cannot reverse bill: Lot {lot.lot_number} ({line.item.name}) has already been consumed ({consumed} {line.item.unit.short_name} sold)."
                )

    # Execute reversal
    for line in bill.lines.all():
        for lot in line.inventory_lots.all():
            reversal_qty = lot.available_quantity
            lot.available_quantity = Decimal('0.000')
            lot.status = 'REVERSED'
            lot.save()

            StockMovement.objects.create(
                inventory_lot=lot,
                movement_type='REVERSAL',
                quantity=reversal_qty,
                reference_type='PURCHASE_BILL',
                reference_id=bill.id,
                created_by=user,
                remarks=f"Reversal of Purchase Bill {bill.bill_number}: {reason}"
            )

    bill.status = 'REVERSED'
    bill.remarks = f"{bill.remarks}\n[REVERSED on {bill.updated_at}]: {reason}".strip()
    bill.save()

    record_audit(
        user=user,
        model_name="PurchaseBill",
        object_id=bill.id,
        action="REVERSE",
        new_values={"status": "REVERSED", "reason": reason},
        description=f"Reversed Purchase Bill {bill.bill_number}. Reason: {reason}"
    )

    return bill
