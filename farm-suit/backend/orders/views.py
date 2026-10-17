import datetime
from decimal import Decimal
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count
from django.utils import timezone
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from masters.views import paginate_queryset
from orders.models import Order, OrderLine, OrderAdvance
from orders.services.order_service import (
    create_order,
    record_order_advance,
    change_order_status,
    fulfill_order_to_sale
)

@require_http_methods(["GET", "POST"])
@api_login_required
def orders_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        customer_id = request.GET.get("customer_id", "").strip()
        order_type = request.GET.get("order_type", "").strip().upper()
        status = request.GET.get("status", "").strip().upper()
        delivery_date = request.GET.get("delivery_date", "").strip()
        from_date = request.GET.get("from_date", "").strip()
        to_date = request.GET.get("to_date", "").strip()
        date_preset = request.GET.get("date_preset", "").strip().lower()
        item_id = request.GET.get("item_id", "").strip()
        overdue = request.GET.get("overdue", "").strip().lower() in ('true', '1')

        qs = Order.objects.select_related('customer', 'created_by', 'assigned_to', 'fulfilled_sales_bill').all()

        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) |
                Q(customer__customer_name__icontains=search) |
                Q(customer__customer_code__icontains=search)
            )
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if order_type in ('REGULAR', 'ADVANCE'):
            qs = qs.filter(order_type=order_type)
        if status in [c[0] for c in Order.STATUS_CHOICES]:
            qs = qs.filter(status=status)
        if delivery_date:
            qs = qs.filter(delivery_date=delivery_date)

        today = timezone.now().date()
        if overdue:
            qs = qs.filter(delivery_date__lt=today).exclude(status__in=['DELIVERED', 'CANCELLED'])

        if date_preset == "today":
            qs = qs.filter(delivery_date=today)
        elif date_preset == "upcoming_week":
            qs = qs.filter(delivery_date__gte=today, delivery_date__lte=today + datetime.timedelta(days=7))
        elif date_preset == "this_month":
            qs = qs.filter(delivery_date__year=today.year, delivery_date__month=today.month)
        else:
            if from_date:
                qs = qs.filter(delivery_date__gte=from_date)
            if to_date:
                qs = qs.filter(delivery_date__lte=to_date)

        if item_id:
            qs = qs.filter(lines__item_id=item_id).distinct()

        # Summary Metrics
        totals = qs.exclude(status='CANCELLED').aggregate(
            total_val=Sum('total_amount'),
            total_adv=Sum('advance_amount')
        )
        tot_val = totals['total_val'] or Decimal('0.00')
        tot_adv = totals['total_adv'] or Decimal('0.00')
        tot_rem = max(Decimal('0.00'), tot_val - tot_adv)

        counts = qs.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='PENDING')),
            confirmed=Count('id', filter=Q(status='CONFIRMED')),
            in_prep=Count('id', filter=Q(status='IN_PREPARATION')),
            ready=Count('id', filter=Q(status='READY')),
            dispatched=Count('id', filter=Q(status='DISPATCHED')),
            delivered=Count('id', filter=Q(status='DELIVERED')),
            cancelled=Count('id', filter=Q(status='CANCELLED'))
        )

        summary = {
            "total_orders": counts['total'] or 0,
            "pending_count": counts['pending'] or 0,
            "confirmed_count": counts['confirmed'] or 0,
            "in_prep_count": counts['in_prep'] or 0,
            "ready_count": counts['ready'] or 0,
            "dispatched_count": counts['dispatched'] or 0,
            "delivered_count": counts['delivered'] or 0,
            "cancelled_count": counts['cancelled'] or 0,
            "total_value": str(tot_val),
            "total_advances": str(tot_adv),
            "total_expected_balance": str(tot_rem)
        }

        paginated = paginate_queryset(qs, request)
        data = [{
            "id": o.id,
            "order_number": o.order_number,
            "order_type": o.order_type,
            "order_type_display": o.get_order_type_display(),
            "customer": {
                "id": o.customer.id,
                "customer_name": o.customer.customer_name,
                "customer_code": o.customer.customer_code,
                "name": o.customer.customer_name,
                "code": o.customer.customer_code,
                "phone": o.customer.phone
            },
            "order_date": o.order_date,
            "delivery_date": o.delivery_date,
            "status": o.status,
            "subtotal": str(o.subtotal),
            "tax_amount": str(o.tax_amount),
            "discount": str(o.discount),
            "total_amount": str(o.total_amount),
            "advance_amount": str(o.advance_amount),
            "remaining_balance": str(o.remaining_balance),
            "lines_count": o.lines.count(),
            "advances_count": o.advances.count(),
            "fulfilled_sales_bill": {
                "id": o.fulfilled_sales_bill.id,
                "bill_number": o.fulfilled_sales_bill.bill_number
            } if o.fulfilled_sales_bill else None,
            "created_by": o.created_by.username if o.created_by else "",
            "created_at": o.created_at
        } for o in paginated['items']]

        return json_success({
            "orders": data,
            "summary": summary,
            "pagination": paginated['pagination']
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            order = create_order(data, request.user)
            return json_success({
                "id": order.id,
                "order_number": order.order_number,
                "order_type": order.order_type,
                "total_amount": str(order.total_amount),
                "advance_amount": str(order.advance_amount),
                "status": order.status
            }, message=f"{order.get_order_type_display()} {order.order_number} created successfully", status=201)
        except ValidationError as e:
            return json_error(
                message="Order creation failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else {"detail": e.messages},
                status=400
            )

@require_http_methods(["GET"])
@api_login_required
def order_detail_view(request, pk):
    try:
        order = Order.objects.select_related('customer', 'created_by', 'assigned_to', 'fulfilled_sales_bill').prefetch_related(
            'lines__item', 'lines__item__unit', 'advances__recorded_by'
        ).get(pk=pk)
    except Order.DoesNotExist:
        return json_error("Order not found", status=404)

    lines_data = [{
        "id": l.id,
        "item": {
            "id": l.item.id,
            "name": l.item.name,
            "item_code": l.item.item_code,
            "unit": l.item.unit.short_name
        },
        "quantity": str(l.quantity),
        "unit_rate": str(l.unit_rate),
        "amount": str(l.amount),
        "notes": l.notes
    } for l in order.lines.all()]

    advances_data = [{
        "id": a.id,
        "payment_date": a.payment_date,
        "amount": str(a.amount),
        "payment_method": a.payment_method,
        "payment_method_display": a.get_payment_method_display(),
        "reference_number": a.reference_number,
        "notes": a.notes,
        "recorded_by": a.recorded_by.username if a.recorded_by else "",
        "created_at": a.created_at
    } for a in order.advances.all()]

    return json_success({
        "id": order.id,
        "order_number": order.order_number,
        "order_type": order.order_type,
        "order_type_display": order.get_order_type_display(),
        "customer": {
            "id": order.customer.id,
            "customer_name": order.customer.customer_name,
            "customer_code": order.customer.customer_code,
            "name": order.customer.customer_name,
            "code": order.customer.customer_code,
            "phone": order.customer.phone,
            "address": order.customer.address,
            "gst_number": order.customer.gst_number
        },
        "order_date": order.order_date,
        "delivery_date": order.delivery_date,
        "status": order.status,
        "subtotal": str(order.subtotal),
        "tax_amount": str(order.tax_amount),
        "discount": str(order.discount),
        "total_amount": str(order.total_amount),
        "advance_amount": str(order.advance_amount),
        "remaining_balance": str(order.remaining_balance),
        "delivery_address": order.delivery_address,
        "delivery_instructions": order.delivery_instructions,
        "notes": order.notes,
        "fulfilled_sales_bill": {
            "id": order.fulfilled_sales_bill.id,
            "bill_number": order.fulfilled_sales_bill.bill_number,
            "grand_total": str(order.fulfilled_sales_bill.grand_total),
            "status": order.fulfilled_sales_bill.status
        } if order.fulfilled_sales_bill else None,
        "created_by": order.created_by.username if order.created_by else "",
        "lines": lines_data,
        "advances": advances_data,
        "created_at": order.created_at,
        "updated_at": order.updated_at
    })

@require_http_methods(["POST"])
@api_login_required
def order_status_view(request, pk):
    data = parse_json_body(request)
    new_status = data.get("status", "")
    notes = data.get("notes", "")

    try:
        order = change_order_status(pk, new_status, request.user, notes)
        return json_success({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status
        }, message=f"Order {order.order_number} status updated to {order.status}")
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["GET", "POST"])
@api_login_required
def order_advances_view(request, pk):
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return json_error("Order not found", status=404)

    if request.method == "GET":
        advances = order.advances.select_related('recorded_by').all()
        data = [{
            "id": a.id,
            "payment_date": a.payment_date,
            "amount": str(a.amount),
            "payment_method": a.payment_method,
            "payment_method_display": a.get_payment_method_display(),
            "reference_number": a.reference_number,
            "notes": a.notes,
            "recorded_by": a.recorded_by.username if a.recorded_by else "",
            "created_at": a.created_at
        } for a in advances]
        return json_success({
            "order_id": order.id,
            "order_number": order.order_number,
            "total_amount": str(order.total_amount),
            "advance_amount": str(order.advance_amount),
            "remaining_balance": str(order.remaining_balance),
            "advances": data
        })

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        try:
            advance, updated_order = record_order_advance(pk, data, request.user)
            return json_success({
                "advance": {
                    "id": advance.id,
                    "payment_date": advance.payment_date,
                    "amount": str(advance.amount),
                    "payment_method": advance.payment_method,
                    "reference_number": advance.reference_number
                },
                "order": {
                    "id": updated_order.id,
                    "advance_amount": str(updated_order.advance_amount),
                    "remaining_balance": str(updated_order.remaining_balance)
                }
            }, message=f"Advance payment of ₹{advance.amount} recorded for {updated_order.order_number}", status=201)
        except ValidationError as e:
            return json_error(
                message="Advance payment recording failed",
                errors=e.message_dict if hasattr(e, 'message_dict') else (e.messages if hasattr(e, 'messages') else str(e)),
                status=400
            )

@require_http_methods(["POST"])
@api_login_required
def order_fulfill_view(request, pk):
    data = parse_json_body(request)
    post_now = data.get("post_now", True) if data else True

    try:
        bill, order = fulfill_order_to_sale(pk, request.user, post_immediately=post_now)
        return json_success({
            "order": {
                "id": order.id,
                "order_number": order.order_number,
                "status": order.status
            },
            "sales_bill": {
                "id": bill.id,
                "bill_number": bill.bill_number,
                "grand_total": str(bill.grand_total),
                "amount_paid": str(bill.amount_paid),
                "remaining_balance": str(bill.remaining_balance),
                "payment_status": bill.payment_status,
                "status": bill.status
            }
        }, message=f"Order {order.order_number} converted into Sales Bill {bill.bill_number} successfully. Advances applied.", status=201)
    except ValidationError as e:
        return json_error(message=str(e.messages[0]) if hasattr(e, 'messages') else str(e), status=400)

@require_http_methods(["GET"])
@api_login_required
def orders_calendar_view(request):
    """
    Planning dashboard and calendar view of deliveries:
    Groups upcoming commitments into Today, Tomorrow, Upcoming Week, Overdue, and Future.
    """
    today = timezone.now().date()
    tomorrow = today + datetime.timedelta(days=1)
    week_end = today + datetime.timedelta(days=7)

    active_orders = Order.objects.filter(
        status__in=['PENDING', 'CONFIRMED', 'IN_PREPARATION', 'READY', 'DISPATCHED']
    ).select_related('customer').prefetch_related('lines__item')

    overdue_orders = active_orders.filter(delivery_date__lt=today).order_by('delivery_date')
    today_orders = active_orders.filter(delivery_date=today).order_by('delivery_date')
    tomorrow_orders = active_orders.filter(delivery_date=tomorrow).order_by('delivery_date')
    upcoming_week_orders = active_orders.filter(delivery_date__gt=tomorrow, delivery_date__lte=week_end).order_by('delivery_date')
    future_orders = active_orders.filter(delivery_date__gt=week_end).order_by('delivery_date')

    def format_orders(queryset):
        return [{
            "id": o.id,
            "order_number": o.order_number,
            "order_type": o.order_type,
            "customer_name": o.customer.customer_name,
            "phone": o.customer.phone,
            "delivery_date": o.delivery_date,
            "status": o.status,
            "total_amount": str(o.total_amount),
            "advance_amount": str(o.advance_amount),
            "remaining_balance": str(o.remaining_balance),
            "items_summary": ", ".join([f"{l.quantity} {l.item.unit.short_name} {l.item.name}" for l in o.lines.all()[:3]])
        } for o in queryset]

    return json_success({
        "planning": {
            "overdue": format_orders(overdue_orders),
            "today": format_orders(today_orders),
            "tomorrow": format_orders(tomorrow_orders),
            "upcoming_week": format_orders(upcoming_week_orders),
            "future": format_orders(future_orders),
            "counts": {
                "overdue": overdue_orders.count(),
                "today": today_orders.count(),
                "tomorrow": tomorrow_orders.count(),
                "upcoming_week": upcoming_week_orders.count(),
                "future": future_orders.count()
            }
        }
    })
