from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db.models import Q
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from masters.views import paginate_queryset
from .models import CultivationBatch, Harvest
from .services.harvest_service import save_cultivation_batch, save_harvest, post_harvest

# ----------------- CULTIVATION -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def cultivation_batches_view(request):
    if request.method == "GET":
        status = request.GET.get("status", "").strip().upper()
        plot_id = request.GET.get("plot_id", "").strip()
        item_id = request.GET.get("item_id", "").strip()
        search = request.GET.get("search", "").strip()

        qs = CultivationBatch.objects.select_related('item', 'item__unit', 'farm_plot', 'created_by').all()
        if status:
            qs = qs.filter(status=status)
        if plot_id:
            qs = qs.filter(farm_plot_id=plot_id)
        if item_id:
            qs = qs.filter(item_id=item_id)
        if search:
            qs = qs.filter(
                Q(batch_number__icontains=search) |
                Q(item__name__icontains=search) |
                Q(farm_plot__name__icontains=search)
            )

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": b.id,
            "batch_number": b.batch_number,
            "item": {
                "id": b.item.id,
                "name": b.item.name,
                "unit": b.item.unit.short_name
            },
            "farm_plot": {
                "id": b.farm_plot.id,
                "name": b.farm_plot.name
            },
            "start_date": b.start_date,
            "expected_harvest_date": b.expected_harvest_date,
            "actual_harvest_date": b.actual_harvest_date,
            "area": str(b.area),
            "cultivated_quantity": str(b.cultivated_quantity),
            "status": b.status,
            "remarks": b.remarks,
            "created_by": b.created_by.username if b.created_by else "",
            "harvests_count": b.harvests.count(),
            "created_at": b.created_at
        } for b in paginated['items']]

        return json_success({"batches": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)
        try:
            batch = save_cultivation_batch(data, request.user)
            return json_success({
                "id": batch.id,
                "batch_number": batch.batch_number,
                "status": batch.status
            }, message="Cultivation batch created successfully", status=201)
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["GET", "PUT"])
@api_login_required
def cultivation_batch_detail_view(request, pk):
    try:
        batch = CultivationBatch.objects.select_related('item', 'item__unit', 'farm_plot', 'created_by').prefetch_related('harvests').get(pk=pk)
    except CultivationBatch.DoesNotExist:
        return json_error("Cultivation batch not found", status=404)

    if request.method == "GET":
        harvests_data = [{
            "id": h.id,
            "harvest_number": h.harvest_number,
            "harvest_date": h.harvest_date,
            "quantity": str(h.quantity),
            "unit_cost": str(h.unit_cost),
            "total_cost": str(h.total_cost),
            "quality_grade": h.quality_grade,
            "status": h.status
        } for h in batch.harvests.all()]

        return json_success({
            "id": batch.id,
            "batch_number": batch.batch_number,
            "item": {
                "id": batch.item.id,
                "name": batch.item.name,
                "unit": batch.item.unit.short_name
            },
            "farm_plot": {
                "id": batch.farm_plot.id,
                "name": batch.farm_plot.name,
                "location": batch.farm_plot.location
            },
            "start_date": batch.start_date,
            "expected_harvest_date": batch.expected_harvest_date,
            "actual_harvest_date": batch.actual_harvest_date,
            "area": str(batch.area),
            "cultivated_quantity": str(batch.cultivated_quantity),
            "status": batch.status,
            "remarks": batch.remarks,
            "harvests": harvests_data,
            "created_at": batch.created_at,
            "updated_at": batch.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)
        try:
            batch = save_cultivation_batch(data, request.user, batch_id=pk)
            return json_success({
                "id": batch.id,
                "batch_number": batch.batch_number,
                "status": batch.status
            }, message="Cultivation batch updated successfully")
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

# ----------------- HARVEST -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def harvests_view(request):
    if request.method == "GET":
        batch_id = request.GET.get("batch_id", "").strip()
        status = request.GET.get("status", "").strip().upper()
        search = request.GET.get("search", "").strip()

        qs = Harvest.objects.select_related('cultivation_batch', 'cultivation_batch__item', 'cultivation_batch__item__unit', 'cultivation_batch__farm_plot', 'accepted_by').all()
        if batch_id:
            qs = qs.filter(cultivation_batch_id=batch_id)
        if status in ('DRAFT', 'POSTED', 'CANCELLED'):
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(
                Q(harvest_number__icontains=search) |
                Q(cultivation_batch__batch_number__icontains=search) |
                Q(cultivation_batch__item__name__icontains=search)
            )

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": h.id,
            "harvest_number": h.harvest_number,
            "batch": {
                "id": h.cultivation_batch.id,
                "batch_number": h.cultivation_batch.batch_number,
                "crop": h.cultivation_batch.item.name,
                "plot": h.cultivation_batch.farm_plot.name
            },
            "item": {
                "id": h.cultivation_batch.item.id,
                "name": h.cultivation_batch.item.name,
                "unit": h.cultivation_batch.item.unit.short_name
            },
            "harvest_date": h.harvest_date,
            "quantity": str(h.quantity),
            "unit_cost": str(h.unit_cost),
            "total_cost": str(h.total_cost),
            "quality_grade": h.quality_grade,
            "status": h.status,
            "accepted_by": h.accepted_by.username if h.accepted_by else "",
            "remarks": h.remarks,
            "created_at": h.created_at
        } for h in paginated['items']]

        return json_success({"harvests": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)
        try:
            h = save_harvest(data, request.user)
            return json_success({
                "id": h.id,
                "harvest_number": h.harvest_number,
                "quantity": str(h.quantity),
                "total_cost": str(h.total_cost),
                "status": h.status
            }, message="Harvest record draft created successfully", status=201)
        except ValidationError as e:
            return json_error(
                message="Validation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["GET"])
@api_login_required
def harvest_detail_view(request, pk):
    try:
        h = Harvest.objects.select_related('cultivation_batch', 'cultivation_batch__item', 'cultivation_batch__item__unit', 'cultivation_batch__farm_plot', 'accepted_by').prefetch_related('inventory_lots').get(pk=pk)
    except Harvest.DoesNotExist:
        return json_error("Harvest not found", status=404)

    lots_data = [{
        "lot_id": lot.id,
        "lot_number": lot.lot_number,
        "available_quantity": str(lot.available_quantity),
        "status": lot.status
    } for lot in h.inventory_lots.all()]

    return json_success({
        "id": h.id,
        "harvest_number": h.harvest_number,
        "batch": {
            "id": h.cultivation_batch.id,
            "batch_number": h.cultivation_batch.batch_number,
            "crop": h.cultivation_batch.item.name,
            "plot": h.cultivation_batch.farm_plot.name
        },
        "item": {
            "id": h.cultivation_batch.item.id,
            "name": h.cultivation_batch.item.name,
            "unit": h.cultivation_batch.item.unit.short_name
        },
        "harvest_date": h.harvest_date,
        "quantity": str(h.quantity),
        "unit_cost": str(h.unit_cost),
        "total_cost": str(h.total_cost),
        "quality_grade": h.quality_grade,
        "status": h.status,
        "accepted_by": h.accepted_by.username if h.accepted_by else "",
        "remarks": h.remarks,
        "lots": lots_data,
        "created_at": h.created_at
    })

@require_http_methods(["POST"])
@api_login_required
def post_harvest_view(request, pk):
    try:
        h = post_harvest(pk, request.user)
        return json_success({
            "id": h.id,
            "harvest_number": h.harvest_number,
            "status": h.status
        }, message=f"Harvest {h.harvest_number} posted successfully. Inventory updated with farm produce.")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)
