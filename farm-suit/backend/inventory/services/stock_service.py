import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from inventory.models import InventoryLot, StockMovement
from audit.services.audit_service import record_audit

def generate_lot_number():
    date_str = timezone.now().strftime('%Y%m%d')
    rand_str = uuid.uuid4().hex[:6].upper()
    return f"LOT-{date_str}-{rand_str}"

@transaction.atomic
def create_stock_receipt(
    item,
    source_type,
    quantity,
    unit_cost,
    received_date,
    user,
    purchase_line=None,
    harvest=None,
    reference_type="",
    reference_id=0,
    remarks=""
):
    """
    Creates an InventoryLot and corresponding RECEIPT StockMovement.
    Executed inside an atomic transaction.
    """
    lot_number = generate_lot_number()
    lot = InventoryLot.objects.create(
        lot_number=lot_number,
        item=item,
        source_type=source_type,
        purchase_line=purchase_line,
        harvest=harvest,
        received_date=received_date,
        original_quantity=quantity,
        available_quantity=quantity,
        unit_cost=unit_cost,
        status='AVAILABLE'
    )

    movement = StockMovement.objects.create(
        inventory_lot=lot,
        movement_type='RECEIPT',
        quantity=quantity,
        reference_type=reference_type,
        reference_id=reference_id,
        created_by=user,
        remarks=remarks or f"Stock received from {source_type}"
    )

    record_audit(
        user=user,
        model_name="InventoryLot",
        object_id=lot.id,
        action="CREATE",
        new_values={
            "lot_number": lot.lot_number,
            "item": item.name,
            "source_type": source_type,
            "quantity": str(quantity),
            "unit_cost": str(unit_cost)
        },
        description=f"Received {quantity} {item.unit.short_name} into {lot.lot_number} via {source_type}"
    )

    return lot, movement
