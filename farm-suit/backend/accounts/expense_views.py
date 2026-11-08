from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import api_login_required, permission_required, parse_json_body
from audit.services.audit_service import record_audit
from accounts.models import Expense


def generate_expense_number():
    year = timezone.now().year
    prefix = f"EXP-{year}-"
    last_expense = Expense.objects.filter(expense_number__startswith=prefix).order_by('-expense_number').first()
    if last_expense:
        try:
            last_seq = int(last_expense.expense_number.split('-')[-1])
            new_seq = last_seq + 1
        except (ValueError, IndexError):
            new_seq = Expense.objects.filter(expense_number__startswith=prefix).count() + 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"


def serialize_expense(exp):
    return {
        "id": exp.id,
        "expense_number": exp.expense_number,
        "expense_type": exp.expense_type,
        "expense_type_display": exp.get_expense_type_display(),
        "title": exp.title,
        "amount": str(exp.amount),
        "expense_date": str(exp.expense_date),
        "payment_mode": exp.payment_mode,
        "payment_mode_display": exp.get_payment_mode_display(),
        "payee_name": exp.payee_name or "",
        "department_name": exp.department_name or "",
        "reference_no": exp.reference_no or "",
        "remarks": exp.remarks or "",
        "created_by": exp.created_by.username if exp.created_by else "",
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
        "updated_at": exp.updated_at.isoformat() if exp.updated_at else None,
    }


@require_http_methods(["GET", "POST"])
@api_login_required
def expenses_list_create_view(request):
    from accounts.services.permission_service import has_permission
    if request.method == "GET":
        if not has_permission(request.user, 'expenses.view'):
            return json_error("Forbidden: You do not have permission to view expenses.", status=403)

        qs = Expense.objects.select_related('created_by').all()

        # Date range filters
        start_date = request.GET.get("start_date") or request.GET.get("from_date")
        end_date = request.GET.get("end_date") or request.GET.get("to_date")
        expense_type = request.GET.get("expense_type", "").strip().upper()
        payment_mode = request.GET.get("payment_mode", "").strip().upper()
        search = request.GET.get("search", "").strip()

        if start_date:
            qs = qs.filter(expense_date__gte=start_date)
        if end_date:
            qs = qs.filter(expense_date__lte=end_date)
        if expense_type:
            qs = qs.filter(expense_type=expense_type)
        if payment_mode:
            qs = qs.filter(payment_mode=payment_mode)
        if search:
            qs = qs.filter(
                Q(expense_number__icontains=search) |
                Q(title__icontains=search) |
                Q(payee_name__icontains=search) |
                Q(department_name__icontains=search) |
                Q(reference_no__icontains=search) |
                Q(remarks__icontains=search)
            )

        # Aggregations for summary cards
        total_amount = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_count = qs.count()

        # Category totals in the filtered range
        cat_breakdown = {
            'DEPARTMENT': str(qs.filter(expense_type='DEPARTMENT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            'LABOUR': str(qs.filter(expense_type='LABOUR').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            'MEDICINE': str(qs.filter(expense_type='MEDICINE').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            'TOOLS': str(qs.filter(expense_type='TOOLS').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            'TRANSPORT': str(qs.filter(expense_type='TRANSPORT').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            'FUEL': str(qs.filter(expense_type='FUEL').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
        }

        # Pagination
        try:
            page = max(1, int(request.GET.get("page", 1)))
        except ValueError:
            page = 1
        try:
            page_size = max(1, min(100, int(request.GET.get("page_size", 20))))
        except ValueError:
            page_size = 20

        total_pages = max(1, (total_count + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        expenses_page = qs[start_idx:end_idx]
        expenses_data = [serialize_expense(exp) for exp in expenses_page]

        return json_success({
            "expenses": expenses_data,
            "summary": {
                "total_amount": str(total_amount),
                "total_count": total_count,
                "category_breakdown": cat_breakdown,
            },
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_records": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        })

    elif request.method == "POST":
        # Permission check
        from accounts.services.permission_service import has_permission
        if not has_permission(request.user, 'expenses.create'):
            return json_error("Forbidden: You do not have permission to create expenses.", status=403)

        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        expense_type = data.get("expense_type", "").strip().upper()
        title = data.get("title", "").strip()
        raw_amount = data.get("amount")
        expense_date = data.get("expense_date")
        payment_mode = data.get("payment_mode", "CASH").strip().upper()
        payee_name = data.get("payee_name", "").strip()
        department_name = data.get("department_name", "").strip()
        reference_no = data.get("reference_no", "").strip()
        remarks = data.get("remarks", "").strip()

        errors = {}
        valid_types = [c[0] for c in Expense.EXPENSE_TYPE_CHOICES]
        if not expense_type or expense_type not in valid_types:
            errors["expense_type"] = [f"Expense type must be one of: {', '.join(valid_types)}"]

        if not title:
            errors["title"] = ["Expense title / purpose is required."]

        try:
            amount = Decimal(str(raw_amount))
            if amount <= Decimal('0.00'):
                errors["amount"] = ["Amount must be greater than zero."]
        except Exception:
            errors["amount"] = ["Valid amount is required."]

        if not expense_date:
            errors["expense_date"] = ["Expense date is required."]

        valid_modes = [c[0] for c in Expense.PAYMENT_MODE_CHOICES]
        if payment_mode not in valid_modes:
            payment_mode = 'CASH'

        if errors:
            return json_error("Validation failed", errors=errors, status=400)

        with transaction.atomic():
            voucher_no = generate_expense_number()
            # Double check uniqueness in case of race condition
            while Expense.objects.filter(expense_number=voucher_no).exists():
                seq = int(voucher_no.split('-')[-1]) + 1
                year = timezone.now().year
                voucher_no = f"EXP-{year}-{seq:04d}"

            expense = Expense.objects.create(
                expense_number=voucher_no,
                expense_type=expense_type,
                title=title,
                amount=amount,
                expense_date=expense_date,
                payment_mode=payment_mode,
                payee_name=payee_name,
                department_name=department_name,
                reference_no=reference_no,
                remarks=remarks,
                created_by=request.user
            )

            record_audit(
                user=request.user,
                model_name="Expense",
                object_id=expense.id,
                action="CREATE",
                new_values=serialize_expense(expense),
                description=f"Created Expense {expense.expense_number} ({expense.get_expense_type_display()}) of ₹{expense.amount}"
            )

        return json_success(serialize_expense(expense), message=f"Expenditure {expense.expense_number} recorded successfully.", status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
@api_login_required
def expense_detail_view(request, pk):
    try:
        exp = Expense.objects.select_related('created_by').get(pk=pk)
    except Expense.DoesNotExist:
        return json_error("Expenditure record not found", status=404)

    from accounts.services.permission_service import has_permission

    if request.method == "GET":
        if not has_permission(request.user, 'expenses.view'):
            return json_error("Forbidden: You do not have permission to view expenses.", status=403)
        return json_success(serialize_expense(exp))

    elif request.method == "PUT":
        if not has_permission(request.user, 'expenses.edit'):
            return json_error("Forbidden: You do not have permission to edit expenses.", status=403)

        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        old_values = serialize_expense(exp)
        changed = []

        if "title" in data and data["title"].strip() and data["title"].strip() != exp.title:
            exp.title = data["title"].strip()
            changed.append("title")

        if "expense_type" in data:
            new_type = data["expense_type"].strip().upper()
            if new_type in [c[0] for c in Expense.EXPENSE_TYPE_CHOICES] and new_type != exp.expense_type:
                exp.expense_type = new_type
                changed.append("expense_type")

        if "amount" in data:
            try:
                new_amt = Decimal(str(data["amount"]))
                if new_amt > Decimal('0.00') and new_amt != exp.amount:
                    exp.amount = new_amt
                    changed.append("amount")
            except Exception:
                return json_error("Invalid amount provided", status=400)

        if "expense_date" in data and str(data["expense_date"]) != str(exp.expense_date):
            exp.expense_date = data["expense_date"]
            changed.append("expense_date")

        if "payment_mode" in data:
            new_mode = data["payment_mode"].strip().upper()
            if new_mode in [c[0] for c in Expense.PAYMENT_MODE_CHOICES] and new_mode != exp.payment_mode:
                exp.payment_mode = new_mode
                changed.append("payment_mode")

        if "payee_name" in data and data["payee_name"].strip() != exp.payee_name:
            exp.payee_name = data["payee_name"].strip()
            changed.append("payee_name")

        if "department_name" in data and data["department_name"].strip() != exp.department_name:
            exp.department_name = data["department_name"].strip()
            changed.append("department_name")

        if "reference_no" in data and data["reference_no"].strip() != exp.reference_no:
            exp.reference_no = data["reference_no"].strip()
            changed.append("reference_no")

        if "remarks" in data and data["remarks"].strip() != exp.remarks:
            exp.remarks = data["remarks"].strip()
            changed.append("remarks")

        if changed:
            exp.save()
            new_values = serialize_expense(exp)
            record_audit(
                user=request.user,
                model_name="Expense",
                object_id=exp.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values=new_values,
                description=f"Updated Expense {exp.expense_number}: {', '.join(changed)}"
            )

        return json_success(serialize_expense(exp), message="Expenditure updated successfully.")

    elif request.method == "DELETE":
        if not has_permission(request.user, 'expenses.delete'):
            return json_error("Forbidden: You do not have permission to delete expenses.", status=403)

        old_snapshot = serialize_expense(exp)
        expense_number = exp.expense_number
        exp_id = exp.id

        exp.delete()

        record_audit(
            user=request.user,
            model_name="Expense",
            object_id=str(exp_id),
            action="DELETE",
            old_values=old_snapshot,
            description=f"Deleted Expense {expense_number} ({old_snapshot.get('title')}) of ₹{old_snapshot.get('amount')}"
        )

        return json_success({
            "id": exp_id,
            "expense_number": expense_number
        }, message=f"Expenditure {expense_number} deleted successfully.")

