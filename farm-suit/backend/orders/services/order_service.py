import datetime
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from orders.models import Order, OrderLine, OrderAdvance
from masters.models import Customer, Item
from sales.models import SalesBill, SalesLine, SalesPayment
from sales.services.billing_service import post_sales_bill
from audit.services.audit_service import record_audit

VALID_STATUS_TRANSITIONS = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['IN_PREPARATION', 'CANCELLED'],
    'IN_PREPARATION': ['READY', 'CANCELLED'],
    'READY': ['DISPATCHED', 'DELIVERED', 'CANCELLED'],
    'DISPATCHED': ['DELIVERED', 'CANCELLED'],
    'DELIVERED': [],
    'CANCELLED': []
}

@transaction.atomic
def create_order(data, user):
    """
    Creates a new REGULAR or ADVANCE order without affecting inventory or recognizing sales revenue.
    """
    customer_id = data.get("customer_id")
    order_type = data.get("order_type", "REGULAR").strip().upper()
    order_date = data.get("order_date") or timezone.now().date()
    delivery_date = data.get("delivery_date")
    delivery_address = data.get("delivery_address", "").strip()
    delivery_instructions = data.get("delivery_instructions", "").strip()
    notes = data.get("notes", "").strip()
    items_data = data.get("items", [])

    if order_type not in ('REGULAR', 'ADVANCE'):
        order_type = 'REGULAR'

    if not customer_id:
        raise ValidationError({"customer_id": ["Customer is required"]})
    try:
        customer = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        raise ValidationError({"customer_id": ["Customer does not exist"]})

    if not delivery_date:
        raise ValidationError({"delivery_date": ["Requested delivery date is required"]})

    if not items_data:
        raise ValidationError({"items": ["At least one item is required in the order"]})

    # Generate unique order number
    year = timezone.now().year
    prefix = "ADV" if order_type == "ADVANCE" else "ORD"
    count = Order.objects.filter(order_type=order_type).count() + 1
    order_number = f"{prefix}-{year}-{count:04d}"
    while Order.objects.filter(order_number=order_number).exists():
        count += 1
        order_number = f"{prefix}-{year}-{count:04d}"

    try:
        tax_amount = Decimal(str(data.get("tax_amount", "0.00")))
        discount = Decimal(str(data.get("discount", "0.00")))
        if tax_amount < 0 or discount < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Tax and discount must be non-negative decimals")

    # Validate lines and subtotal
    subtotal = Decimal('0.00')
    validated_lines = []
    for idx, it in enumerate(items_data):
        item_id = it.get("item_id")
        if not item_id:
            raise ValidationError({f"items[{idx}].item_id": ["Item is required"]})
        try:
            item = Item.objects.get(pk=item_id)
        except Item.DoesNotExist:
            raise ValidationError({f"items[{idx}].item_id": ["Item does not exist"]})

        try:
            qty = Decimal(str(it.get("quantity", "0")))
            rate = Decimal(str(it.get("unit_rate", "0")))
            if qty <= 0 or rate < 0:
                raise ValueError
        except (ValueError, TypeError):
            raise ValidationError({f"items[{idx}]": ["Quantity must be > 0 and unit rate must be >= 0"]})

        amount = (qty * rate).quantize(Decimal('0.01'))
        subtotal += amount
        validated_lines.append({
            "item": item,
            "quantity": qty,
            "unit_rate": rate,
            "amount": amount,
            "notes": it.get("notes", "")
        })

    total_amount = (subtotal + tax_amount - discount).quantize(Decimal('0.01'))
    if total_amount < Decimal('0.00'):
        total_amount = Decimal('0.00')

    order = Order.objects.create(
        order_number=order_number,
        order_type=order_type,
        customer=customer,
        order_date=order_date,
        delivery_date=delivery_date,
        status='PENDING',
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount=discount,
        total_amount=total_amount,
        delivery_address=delivery_address,
        delivery_instructions=delivery_instructions,
        notes=notes,
        created_by=user
    )

    for vl in validated_lines:
        OrderLine.objects.create(
            order=order,
            item=vl["item"],
            quantity=vl["quantity"],
            unit_rate=vl["unit_rate"],
            amount=vl["amount"],
            notes=vl["notes"]
        )

    # Initial advance payment if provided
    initial_advance = data.get("advance_amount") or data.get("initial_advance")
    if initial_advance:
        try:
            adv_amt = Decimal(str(initial_advance))
            if adv_amt > Decimal('0.00'):
                if adv_amt > total_amount:
                    raise ValidationError("Advance amount cannot exceed the order total")
                OrderAdvance.objects.create(
                    order=order,
                    payment_date=order_date,
                    amount=adv_amt,
                    payment_method=data.get("payment_method", "CASH"),
                    reference_number=data.get("payment_reference", ""),
                    notes=data.get("payment_notes", "Initial advance on order booking"),
                    recorded_by=user
                )
                order.update_advance_amount()
        except (ValueError, TypeError):
            pass

    record_audit(
        user=user,
        model_name="Order",
        object_id=order.id,
        action="CREATE",
        new_values={
            "order_number": order.order_number,
            "order_type": order.order_type,
            "customer": customer.customer_name,
            "delivery_date": str(order.delivery_date),
            "total_amount": str(order.total_amount),
            "advance_amount": str(order.advance_amount)
        },
        description=f"Created {order.get_order_type_display()} {order.order_number} for {customer.customer_name} (Delivery: {order.delivery_date})"
    )

    return order

@transaction.atomic
def record_order_advance(order_id, advance_data, user):
    """
    Records an advance payment against an order.
    """
    try:
        order = Order.objects.select_for_update().get(pk=order_id)
    except Order.DoesNotExist:
        raise ValidationError("Order not found")

    if order.status in ('CANCELLED', 'DELIVERED'):
        raise ValidationError(f"Cannot record advance on a {order.status.lower()} order")

    try:
        amount = Decimal(str(advance_data.get("amount", "0")))
        if amount <= Decimal('0.00'):
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError({"amount": ["Advance amount must be greater than zero"]})

    remaining = order.remaining_balance
    if amount > remaining:
        raise ValidationError({"amount": [f"Advance amount (₹{amount}) exceeds remaining expected balance of ₹{remaining}"]})

    payment_date = advance_data.get("payment_date") or timezone.now().date()
    payment_method = advance_data.get("payment_method", "CASH")
    reference_number = advance_data.get("reference_number", "").strip()
    notes = advance_data.get("notes", "").strip()

    advance = OrderAdvance.objects.create(
        order=order,
        payment_date=payment_date,
        amount=amount,
        payment_method=payment_method,
        reference_number=reference_number,
        notes=notes,
        recorded_by=user
    )

    order.update_advance_amount()

    record_audit(
        user=user,
        model_name="OrderAdvance",
        object_id=advance.id,
        action="CREATE",
        new_values={
            "order_number": order.order_number,
            "customer": order.customer.customer_name,
            "amount": str(advance.amount),
            "payment_method": advance.payment_method,
            "remaining_balance": str(order.remaining_balance)
        },
        description=f"Recorded advance of ₹{advance.amount} for Order {order.order_number}. Remaining: ₹{order.remaining_balance}"
    )

    return advance, order

@transaction.atomic
def change_order_status(order_id, new_status, user, notes=""):
    """
    Updates the lifecycle status of an order.
    Validates state transitions to prevent invalid workflows.
    """
    try:
        order = Order.objects.select_for_update().get(pk=order_id)
    except Order.DoesNotExist:
        raise ValidationError("Order not found")

    new_status = new_status.strip().upper()
    if new_status not in [c[0] for c in Order.STATUS_CHOICES]:
        raise ValidationError(f"Invalid order status '{new_status}'")

    if new_status == order.status:
        return order

    allowed_next = VALID_STATUS_TRANSITIONS.get(order.status, [])
    if new_status not in allowed_next:
        raise ValidationError(
            f"Cannot transition order from '{order.status}' to '{new_status}'. Allowed: {', '.join(allowed_next) or 'None'}."
        )

    old_status = order.status
    order.status = new_status
    if notes:
        order.notes = f"{order.notes}\n[{new_status} on {timezone.now().date()}]: {notes}".strip()
    order.save(update_fields=['status', 'notes', 'updated_at'])

    record_audit(
        user=user,
        model_name="Order",
        object_id=order.id,
        action="UPDATE",
        new_values={"status": new_status, "old_status": old_status},
        description=f"Changed Order {order.order_number} status from {old_status} to {new_status}"
    )

    return order

@transaction.atomic
def fulfill_order_to_sale(order_id, user, post_immediately=True):
    """
    Converts a confirmed/ready order into a SalesBill:
    1. Validates order is not CANCELLED or already fulfilled
    2. Generates unique SalesBill with matching lines
    3. Transfers/applies all valid OrderAdvances as SalesPayment records
       (ensuring zero double-counting of cash inflows!)
    4. Posts the sales bill if requested (FIFO stock consumption)
    5. Links fulfilled_sales_bill and marks order DELIVERED
    """
    try:
        order = Order.objects.select_for_update().get(pk=order_id)
    except Order.DoesNotExist:
        raise ValidationError("Order not found")

    if order.status == 'CANCELLED':
        raise ValidationError("Cannot fulfill a cancelled order")

    if order.fulfilled_sales_bill:
        raise ValidationError(f"Order {order.order_number} is already fulfilled via Bill {order.fulfilled_sales_bill.bill_number}")

    # Generate SalesBill number
    year = timezone.now().year
    rand_id = order.id
    bill_number = f"INV-{year}-ORD{rand_id:04d}"
    while SalesBill.objects.filter(bill_number=bill_number).exists():
        rand_id += 10
        bill_number = f"INV-{year}-ORD{rand_id:04d}"

    # Create SalesBill
    bill = SalesBill.objects.create(
        bill_number=bill_number,
        customer=order.customer,
        bill_date=timezone.now().date(),
        sale_type='REGULAR',
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        discount=order.discount,
        grand_total=order.total_amount,
        remarks=f"Fulfilled from Order {order.order_number}. {order.notes}".strip(),
        created_by=user,
        status='DRAFT'
    )

    # Transfer order advances into sales payments seamlessly
    for adv in order.advances.all():
        SalesPayment.objects.create(
            sales_bill=bill,
            customer=order.customer,
            payment_date=adv.payment_date,
            amount=adv.amount,
            payment_method=adv.payment_method,
            reference_number=adv.reference_number or f"ADVANCE-{order.order_number}",
            notes=f"Transferred from Order {order.order_number} advance receipt: {adv.notes}".strip(),
            recorded_by=user
        )
    bill.update_payment_status()

    # If posting immediately, consume stock via FIFO
    if post_immediately:
        items_payload = [{
            "item_id": ol.item.id,
            "quantity": str(ol.quantity),
            "selling_rate": str(ol.unit_rate)
        } for ol in order.lines.all()]

        bill = post_sales_bill(bill.id, items_payload, user)

    # Link order to bill and mark delivered
    order.fulfilled_sales_bill = bill
    order.status = 'DELIVERED'
    order.save(update_fields=['fulfilled_sales_bill', 'status', 'updated_at'])

    record_audit(
        user=user,
        model_name="Order",
        object_id=order.id,
        action="POST",
        new_values={
            "status": "DELIVERED",
            "sales_bill": bill.bill_number,
            "advances_applied": str(order.advance_amount)
        },
        description=f"Fulfilled Order {order.order_number} into Sales Bill {bill.bill_number}. Advances credited."
    )

    return bill, order
