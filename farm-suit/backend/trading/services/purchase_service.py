import datetime
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from trading.models import PurchaseBill, PurchaseLine, VendorPayment
from inventory.services.stock_service import create_stock_receipt
from inventory.models import StockMovement
from audit.services.audit_service import record_audit
from masters.models import Item, Vendor

@transaction.atomic
def save_purchase_bill(data, user, bill_id=None):
    """
    Creates or updates a DRAFT purchase bill.
    Calculates subtotal, tax, discount, grand total, and landed costs.
    Allocates transport, packaging, and procurement expenses across lines.
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
        discount = Decimal(str(data.get("discount", "0.00")))
        transport_cost = Decimal(str(data.get("transport_cost", "0.00")))
        packaging_cost = Decimal(str(data.get("packaging_cost", "0.00")))
        other_procurement_costs = Decimal(str(data.get("other_procurement_costs", "0.00")))
        if (discount < 0 or transport_cost < 0 or
            packaging_cost < 0 or other_procurement_costs < 0):
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Discounts and procurement costs must be non-negative decimals")
    tax_amount = Decimal('0.00')

    bill.vendor = vendor
    bill.bill_number = bill_number
    bill.bill_date = bill_date
    bill.received_date = received_date
    bill.accepted_by = user
    bill.tax_amount = Decimal('0.00')
    bill.discount = discount
    bill.transport_cost = transport_cost
    bill.packaging_cost = packaging_cost
    bill.other_procurement_costs = other_procurement_costs
    bill.remarks = remarks
    bill.save()

    # If updating, remove old lines
    if bill_id:
        bill.lines.all().delete()

    # Pre-validate lines and calculate subtotal
    subtotal = Decimal('0.00')
    validated_lines = []

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
        validated_lines.append({
            "item": item,
            "quantity": qty,
            "unit_rate": rate,
            "amount": line_amount,
            "remarks": line.get("remarks", "")
        })

    grand_total = (subtotal - discount).quantize(Decimal('0.01'))
    if grand_total < Decimal('0.00'):
        grand_total = Decimal('0.00')

    extra_procurement_costs = transport_cost + packaging_cost + other_procurement_costs
    total_landed_cost = (grand_total + extra_procurement_costs).quantize(Decimal('0.01'))

    bill.subtotal = subtotal
    bill.grand_total = grand_total
    bill.total_landed_cost = total_landed_cost
    bill.save()

    # Allocate procurement costs proportionally across lines
    num_lines = len(validated_lines)
    for vline in validated_lines:
        line_amt = vline["amount"]
        qty = vline["quantity"]
        if subtotal > Decimal('0.00'):
            allocated = (line_amt / subtotal * extra_procurement_costs).quantize(Decimal('0.01'))
        else:
            allocated = (extra_procurement_costs / num_lines).quantize(Decimal('0.01'))

        line_landed = line_amt + allocated
        landed_unit = (line_landed / qty).quantize(Decimal('0.01'))

        PurchaseLine.objects.create(
            purchase_bill=bill,
            item=vline["item"],
            quantity=qty,
            unit_rate=vline["unit_rate"],
            amount=line_amt,
            allocated_procurement_cost=allocated,
            landed_cost=line_landed,
            landed_unit_cost=landed_unit,
            remarks=vline["remarks"]
        )

    # Check for initial payment if specified
    initial_payment = data.get("amount_paid") or data.get("amount_received")
    if initial_payment:
        try:
            init_amount = Decimal(str(initial_payment))
            if init_amount > Decimal('0.00'):
                if init_amount > grand_total:
                    raise ValidationError("Initial payment cannot exceed the total bill amount")
                payment_method = data.get("payment_method", "CASH")
                ref_no = data.get("payment_reference", "")
                payment_notes = data.get("payment_notes", "Initial vendor payment on creation")
                VendorPayment.objects.create(
                    purchase_bill=bill,
                    vendor=vendor,
                    payment_date=bill_date,
                    amount=init_amount,
                    payment_method=payment_method,
                    reference_number=ref_no,
                    notes=payment_notes,
                    recorded_by=user
                )
                bill.update_payment_status()
        except (ValueError, TypeError):
            pass

    record_audit(
        user=user,
        model_name="PurchaseBill",
        object_id=bill.id,
        action="UPDATE" if bill_id else "CREATE",
        new_values={
            "bill_number": bill.bill_number,
            "vendor": vendor.vendor_name,
            "grand_total": str(bill.grand_total),
            "total_landed_cost": str(bill.total_landed_cost),
            "payment_status": bill.payment_status,
            "status": bill.status
        },
        description=f"{'Updated' if bill_id else 'Created'} Draft Purchase Bill {bill.bill_number}"
    )

    return bill

@transaction.atomic
def post_purchase_bill(bill_id, user):
    """
    Finalizes and posts a purchase bill:
    Creates InventoryLot records carrying the effective landed unit cost,
    and creates StockMovement records.
    """
    try:
        bill = PurchaseBill.objects.select_for_update().get(pk=bill_id)
    except PurchaseBill.DoesNotExist:
        raise ValidationError("Purchase bill not found")

    if bill.status != 'DRAFT':
        raise ValidationError(f"Cannot post purchase bill in status '{bill.status}'")

    lines = bill.lines.select_related('item', 'item__unit').all()
    if not lines:
        raise ValidationError("Cannot post an empty purchase bill")

    for line in lines:
        # Landed unit cost is embedded into inventory lot for accurate FIFO valuation
        effective_cost = line.landed_unit_cost if line.landed_unit_cost > Decimal('0.00') else line.unit_rate

        create_stock_receipt(
            item=line.item,
            source_type='PURCHASE',
            quantity=line.quantity,
            unit_cost=effective_cost,
            received_date=bill.received_date,
            user=user,
            purchase_line=line,
            reference_type='PURCHASE_BILL',
            reference_id=bill.id,
            remarks=f"Received via Purchase Bill {bill.bill_number} (Landed unit cost: ₹{effective_cost})"
        )

    bill.status = 'POSTED'
    bill.save()

    record_audit(
        user=user,
        model_name="PurchaseBill",
        object_id=bill.id,
        action="POST",
        new_values={
            "status": "POSTED",
            "bill_number": bill.bill_number,
            "total_landed_cost": str(bill.total_landed_cost)
        },
        description=f"Posted Purchase Bill {bill.bill_number}. Landed cost allocated to inventory lots."
    )

    return bill

@transaction.atomic
def reverse_purchase_bill(bill_id, user, reason):
    """
    Reverses a posted purchase bill.
    Verifies that no inventory lots have been consumed and no active payments remain.
    """
    try:
        bill = PurchaseBill.objects.select_for_update().get(pk=bill_id)
    except PurchaseBill.DoesNotExist:
        raise ValidationError("Purchase bill not found")

    if bill.status != 'POSTED':
        raise ValidationError(f"Cannot reverse purchase bill with status '{bill.status}'")

    if not reason or not reason.strip():
        raise ValidationError("A reversal reason is required")

    # Financial integrity check: verify active vendor payments
    if bill.amount_paid > Decimal('0.00'):
        raise ValidationError(
            f"Cannot reverse bill {bill.bill_number}: Active payments to vendor totaling ₹{bill.amount_paid} are recorded. "
            f"Please reverse or resolve recorded payments before reversing the bill."
        )

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

@transaction.atomic
def record_vendor_payment(bill_id, payment_data, user):
    """
    Records an individual payment to a vendor against a purchase bill:
    1. Validates bill exists and is not CANCELLED or REVERSED
    2. Validates payment amount > 0 and amount <= remaining_balance
    3. Creates VendorPayment record
    4. Updates PurchaseBill amount_paid and payment_status
    5. Records AuditLog
    """
    try:
        bill = PurchaseBill.objects.select_for_update().get(pk=bill_id)
    except PurchaseBill.DoesNotExist:
        raise ValidationError("Purchase bill not found")

    if bill.status in ('CANCELLED', 'REVERSED'):
        raise ValidationError(f"Cannot record payment on a {bill.status.lower()} purchase bill")

    try:
        amount = Decimal(str(payment_data.get("amount", "0")))
        if amount <= Decimal('0.00'):
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError({"amount": ["Payment amount must be greater than zero"]})

    remaining = bill.remaining_balance
    if amount > remaining:
        raise ValidationError({"amount": [f"Payment amount (₹{amount}) exceeds outstanding payable of ₹{remaining}"]})

    payment_date = payment_data.get("payment_date") or timezone.now().date()
    payment_method = payment_data.get("payment_method", "CASH")
    reference_number = payment_data.get("reference_number", "").strip()
    notes = payment_data.get("notes", "").strip()

    payment = VendorPayment.objects.create(
        purchase_bill=bill,
        vendor=bill.vendor,
        payment_date=payment_date,
        amount=amount,
        payment_method=payment_method,
        reference_number=reference_number,
        notes=notes,
        recorded_by=user
    )

    bill.update_payment_status()

    record_audit(
        user=user,
        model_name="VendorPayment",
        object_id=payment.id,
        action="CREATE",
        new_values={
            "bill_number": bill.bill_number,
            "vendor": bill.vendor.vendor_name,
            "amount": str(payment.amount),
            "payment_method": payment.payment_method,
            "reference_number": payment.reference_number,
            "bill_remaining_balance": str(bill.remaining_balance),
            "bill_payment_status": bill.payment_status
        },
        description=f"Recorded vendor payment of ₹{payment.amount} via {payment.payment_method} on Bill {bill.bill_number}. Remaining: ₹{bill.remaining_balance}"
    )

    return payment, bill
