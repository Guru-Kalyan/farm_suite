from django.views.decorators.http import require_http_methods
from django.db.models import Q
from utils.response import json_success, json_error
from utils.decorators import admin_required
from masters.views import paginate_queryset
from .models import AuditLog


@require_http_methods(["GET"])
@admin_required
def audit_list_view(request):
    """
    Returns global paginated audit log events.
    Restricted to Administrator only.
    """
    model_name = request.GET.get("model_name", "").strip()
    action = request.GET.get("action", "").strip().upper()
    search = request.GET.get("search", "").strip()

    qs = AuditLog.objects.select_related('user').all()
    if model_name:
        qs = qs.filter(model_name__iexact=model_name)
    if action:
        qs = qs.filter(action=action)
    if search:
        qs = qs.filter(
            Q(description__icontains=search) |
            Q(object_id__icontains=search) |
            Q(model_name__icontains=search) |
            Q(user__username__icontains=search)
        )

    paginated = paginate_queryset(qs, request)
    data = [{
        "id": a.id,
        "user": a.user.username if a.user else "System",
        "timestamp": a.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        "model_name": a.model_name,
        "object_id": a.object_id,
        "action": a.action,
        "changed_fields": a.changed_fields,
        "old_values": a.old_values,
        "new_values": a.new_values,
        "description": a.description,
        "ip_address": a.ip_address
    } for a in paginated['items']]

    return json_success({"logs": data, "pagination": paginated['pagination']})


@require_http_methods(["GET"])
@admin_required
def entity_audit_timeline_view(request, model, object_id):
    """
    Returns chronological change timeline for a specific model instance.
    Powers the AuditTimeline drawer and AuditTooltip.
    Restricted to Administrator only.
    """
    logs = AuditLog.objects.filter(
        model_name__iexact=model,
        object_id=str(object_id)
    ).select_related('user').order_by('-timestamp')

    data = [{
        "id": a.id,
        "user": a.user.username if a.user else "System",
        "timestamp": a.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        "action": a.action,
        "changed_fields": a.changed_fields,
        "old_values": a.old_values,
        "new_values": a.new_values,
        "description": a.description,
        "ip_address": a.ip_address
    } for a in logs]

    latest = data[0] if data else None

    return json_success({
        "model": model,
        "object_id": object_id,
        "latest": latest,
        "timeline": data
    })
