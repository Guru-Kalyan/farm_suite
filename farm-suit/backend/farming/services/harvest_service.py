from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from farming.models import CultivationBatch, Harvest
from inventory.services.stock_service import create_stock_receipt
from audit.services.audit_service import record_audit
from masters.models import Item, FarmPlot

@transaction.atomic
def save_cultivation_batch(data, user, batch_id=None):
    batch_number = data.get("batch_number", "").strip().upper()
    item_id = data.get("item_id")
    farm_plot_id = data.get("farm_plot_id")
    start_date = data.get("start_date")
    expected_harvest_date = data.get("expected_harvest_date") or None
    remarks = data.get("remarks", "").strip()

    if not batch_number:
        raise ValidationError({"batch_number": ["Batch number is required"]})
    if not item_id:
        raise ValidationError({"item_id": ["Crop/Item is required"]})
    if not farm_plot_id:
        raise ValidationError({"farm_plot_id": ["Farm plot is required"]})
    if not start_date:
        raise ValidationError({"start_date": ["Start date is required"]})

    try:
        item = Item.objects.get(pk=item_id)
    except Item.DoesNotExist:
        raise ValidationError({"item_id": ["Item does not exist"]})

    try:
        plot = FarmPlot.objects.get(pk=farm_plot_id)
    except FarmPlot.DoesNotExist:
        raise ValidationError({"farm_plot_id": ["Farm plot does not exist"]})

    try:
        area = Decimal(str(data.get("area", plot.area)))
        cultivated_qty = Decimal(str(data.get("cultivated_quantity", "0")))
        if area <= 0 or cultivated_qty < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Area must be > 0 and cultivated quantity must be >= 0")

    if batch_id:
        try:
            batch = CultivationBatch.objects.get(pk=batch_id)
        except CultivationBatch.DoesNotExist:
            raise ValidationError("Cultivation batch not found")
        if CultivationBatch.objects.filter(batch_number=batch_number).exclude(pk=batch_id).exists():
            raise ValidationError({"batch_number": ["Batch number already exists"]})
    else:
        if CultivationBatch.objects.filter(batch_number=batch_number).exists():
            raise ValidationError({"batch_number": ["Batch number already exists"]})
        batch = CultivationBatch(created_by=user)

    batch.batch_number = batch_number
    batch.item = item
    batch.farm_plot = plot
    batch.start_date = start_date
    batch.expected_harvest_date = expected_harvest_date
    batch.area = area
    batch.cultivated_quantity = cultivated_qty
    batch.status = data.get("status", batch.status or "ACTIVE")
    batch.remarks = remarks
    batch.save()

    record_audit(
        user=user,
        model_name="CultivationBatch",
        object_id=batch.id,
        action="UPDATE" if batch_id else "CREATE",
        new_values={
            "batch_number": batch.batch_number,
            "item": item.name,
            "plot": plot.name,
            "status": batch.status
        },
        description=f"{'Updated' if batch_id else 'Created'} Cultivation Batch {batch.batch_number}"
    )

    return batch

@transaction.atomic
def save_harvest(data, user, harvest_id=None):
    harvest_number = data.get("harvest_number", "").strip().upper()
    batch_id = data.get("cultivation_batch_id")
    harvest_date = data.get("harvest_date")
    quality_grade = data.get("quality_grade", "GRADE_A")
    remarks = data.get("remarks", "").strip()

    if not harvest_number:
        raise ValidationError({"harvest_number": ["Harvest number is required"]})
    if not batch_id:
        raise ValidationError({"cultivation_batch_id": ["Cultivation batch is required"]})
    if not harvest_date:
        raise ValidationError({"harvest_date": ["Harvest date is required"]})

    try:
        batch = CultivationBatch.objects.get(pk=batch_id)
    except CultivationBatch.DoesNotExist:
        raise ValidationError({"cultivation_batch_id": ["Batch does not exist"]})

    try:
        qty = Decimal(str(data.get("quantity", "0")))
        unit_cost = Decimal(str(data.get("unit_cost", "0")))
        if qty <= 0 or unit_cost < 0:
            raise ValueError
    except (ValueError, TypeError):
        raise ValidationError("Quantity must be > 0 and unit cost must be >= 0")

    total_cost = (qty * unit_cost).quantize(Decimal('0.01'))

    if harvest_id:
        try:
            h = Harvest.objects.get(pk=harvest_id)
        except Harvest.DoesNotExist:
            raise ValidationError("Harvest record not found")
        if h.status != 'DRAFT':
            raise ValidationError("Only DRAFT harvests can be modified")
        if Harvest.objects.filter(harvest_number=harvest_number).exclude(pk=harvest_id).exists():
            raise ValidationError({"harvest_number": ["Harvest number already exists"]})
    else:
        if Harvest.objects.filter(harvest_number=harvest_number).exists():
            raise ValidationError({"harvest_number": ["Harvest number already exists"]})
        h = Harvest(accepted_by=user)

    h.harvest_number = harvest_number
    h.cultivation_batch = batch
    h.harvest_date = harvest_date
    h.quantity = qty
    h.unit_cost = unit_cost
    h.total_cost = total_cost
    h.quality_grade = quality_grade
    h.accepted_by = user
    h.remarks = remarks
    h.save()

    record_audit(
        user=user,
        model_name="Harvest",
        object_id=h.id,
        action="UPDATE" if harvest_id else "CREATE",
        new_values={
            "harvest_number": h.harvest_number,
            "batch": batch.batch_number,
            "quantity": str(h.quantity),
            "unit_cost": str(h.unit_cost)
        },
        description=f"{'Updated' if harvest_id else 'Created'} Harvest {h.harvest_number}"
    )

    return h

@transaction.atomic
def post_harvest(harvest_id, user):
    """
    Finalizes and posts a harvest record:
    Creates InventoryLot records (source_type=HARVEST) and StockMovement records.
    """
    try:
        h = Harvest.objects.select_for_update().select_related('cultivation_batch', 'cultivation_batch__item').get(pk=harvest_id)
    except Harvest.DoesNotExist:
        raise ValidationError("Harvest record not found")

    if h.status != 'DRAFT':
        raise ValidationError(f"Cannot post harvest in status '{h.status}'")

    item = h.cultivation_batch.item

    create_stock_receipt(
        item=item,
        source_type='HARVEST',
        quantity=h.quantity,
        unit_cost=h.unit_cost,
        received_date=h.harvest_date,
        user=user,
        harvest=h,
        reference_type='HARVEST',
        reference_id=h.id,
        remarks=f"Received via Harvest {h.harvest_number} (Batch: {h.cultivation_batch.batch_number})"
    )

    h.status = 'POSTED'
    h.save()

    # Update batch status to HARVESTED if not completed
    batch = h.cultivation_batch
    if batch.status in ('PLANNED', 'ACTIVE'):
        batch.status = 'HARVESTED'
        batch.actual_harvest_date = h.harvest_date
        batch.save()

    record_audit(
        user=user,
        model_name="Harvest",
        object_id=h.id,
        action="POST",
        new_values={"status": "POSTED", "harvest_number": h.harvest_number},
        description=f"Posted Harvest {h.harvest_number}. Unified inventory updated with farm-produced stock."
    )

    return h
