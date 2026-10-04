from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db.models import Q, Sum
from decimal import Decimal, InvalidOperation
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from audit.services.audit_service import record_audit
from .models import ItemCategory, UnitOfMeasure, Item, Vendor, Customer, FarmPlot

def paginate_queryset(queryset, request, page_size=20):
    try:
        page = int(request.GET.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    try:
        size = int(request.GET.get('page_size', page_size))
    except (ValueError, TypeError):
        size = page_size
    
    paginator = Paginator(queryset, size)
    page_obj = paginator.get_page(page)
    return {
        'items': list(page_obj.object_list),
        'pagination': {
            'total': paginator.count,
            'page': page_obj.number,
            'pages': paginator.num_pages,
            'page_size': size,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        }
    }

# ----------------- CATEGORIES -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def categories_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        qs = ItemCategory.objects.all()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        
        paginated = paginate_queryset(qs, request)
        data = [{
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        } for cat in paginated['items']]
        return json_success({"categories": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)
        
        name = data.get("name", "").strip()
        description = data.get("description", "").strip()
        
        if not name:
            return json_error("Category name is required", errors={"name": ["Required"]})
        if ItemCategory.objects.filter(name__iexact=name).exists():
            return json_error("Category name already exists", errors={"name": ["Must be unique"]})

        category = ItemCategory.objects.create(name=name, description=description)
        record_audit(
            user=request.user,
            model_name="ItemCategory",
            object_id=category.id,
            action="CREATE",
            new_values={"name": category.name, "description": category.description},
            description=f"Created Category '{category.name}'"
        )
        return json_success({
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "is_active": category.is_active
        }, message="Category created successfully", status=201)

@require_http_methods(["GET", "PUT"])
@api_login_required
def category_detail_view(request, pk):
    try:
        cat = ItemCategory.objects.get(pk=pk)
    except ItemCategory.DoesNotExist:
        return json_error("Category not found", status=404)

    if request.method == "GET":
        return json_success({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)
        
        name = data.get("name", "").strip()
        if not name:
            return json_error("Category name is required", errors={"name": ["Required"]})
        if ItemCategory.objects.filter(name__iexact=name).exclude(pk=pk).exists():
            return json_error("Category name already exists", errors={"name": ["Must be unique"]})
        
        old_values = {"name": cat.name, "description": cat.description, "is_active": cat.is_active}
        changed = []
        if cat.name != name:
            cat.name = name
            changed.append("name")
        if "description" in data and cat.description != data["description"].strip():
            cat.description = data["description"].strip()
            changed.append("description")
        if "is_active" in data and cat.is_active != bool(data["is_active"]):
            cat.is_active = bool(data["is_active"])
            changed.append("is_active")
        
        cat.save()
        if changed:
            record_audit(
                user=request.user,
                model_name="ItemCategory",
                object_id=cat.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values={"name": cat.name, "description": cat.description, "is_active": cat.is_active},
                description=f"Updated Category '{cat.name}'"
            )
        return json_success({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "is_active": cat.is_active
        }, message="Category updated successfully")

# ----------------- UNITS OF MEASURE -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def units_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        qs = UnitOfMeasure.objects.all()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(short_name__icontains=search))
        data = [{
            "id": u.id,
            "name": u.name,
            "short_name": u.short_name,
            "is_active": u.is_active,
            "created_at": u.created_at
        } for u in qs]
        return json_success({"units": data})

    elif request.method == "POST":
        data = parse_json_body(request)
        name = data.get("name", "").strip()
        short_name = data.get("short_name", "").strip()

        if not name or not short_name:
            return json_error("Name and short name are required", errors={
                "name": ["Required"] if not name else [],
                "short_name": ["Required"] if not short_name else []
            })
        if UnitOfMeasure.objects.filter(name__iexact=name).exists():
            return json_error("Unit name already exists", errors={"name": ["Must be unique"]})
        if UnitOfMeasure.objects.filter(short_name__iexact=short_name).exists():
            return json_error("Unit short name already exists", errors={"short_name": ["Must be unique"]})

        unit = UnitOfMeasure.objects.create(name=name, short_name=short_name)
        record_audit(
            user=request.user,
            model_name="UnitOfMeasure",
            object_id=unit.id,
            action="CREATE",
            new_values={"name": unit.name, "short_name": unit.short_name},
            description=f"Created Unit '{unit.name}' ({unit.short_name})"
        )
        return json_success({
            "id": unit.id,
            "name": unit.name,
            "short_name": unit.short_name,
            "is_active": unit.is_active
        }, message="Unit created successfully", status=201)

# ----------------- ITEMS -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def items_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        cat_id = request.GET.get("category", "").strip()
        is_active = request.GET.get("is_active", "").strip()

        qs = Item.objects.select_related('category', 'unit').all()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(item_code__icontains=search))
        if cat_id:
            qs = qs.filter(category_id=cat_id)
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))

        paginated = paginate_queryset(qs, request)
        
        # Calculate available stock dynamically from inventory_lots
        items_data = []
        for item in paginated['items']:
            stock_agg = item.inventory_lots.filter(status='AVAILABLE').aggregate(
                total_stock=Sum('available_quantity')
            )
            current_stock = stock_agg['total_stock'] or Decimal('0.000')

            items_data.append({
                "id": item.id,
                "item_code": item.item_code,
                "name": item.name,
                "category": {
                    "id": item.category.id,
                    "name": item.category.name
                },
                "unit": {
                    "id": item.unit.id,
                    "name": item.unit.name,
                    "short_name": item.unit.short_name
                },
                "description": item.description,
                "minimum_stock": str(item.minimum_stock),
                "current_stock": str(current_stock),
                "is_low_stock": current_stock <= item.minimum_stock if item.minimum_stock > 0 else False,
                "is_active": item.is_active,
                "created_at": item.created_at,
                "updated_at": item.updated_at
            })

        return json_success({"items": items_data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        item_code = data.get("item_code", "").strip().upper()
        name = data.get("name", "").strip()
        category_id = data.get("category_id")
        unit_id = data.get("unit_id")
        description = data.get("description", "").strip()
        
        try:
            min_stock = Decimal(str(data.get("minimum_stock", "0")))
            if min_stock < 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return json_error("Minimum stock must be a non-negative number", errors={"minimum_stock": ["Invalid value"]})

        errors = {}
        if not item_code:
            errors["item_code"] = ["Item code is required"]
        elif Item.objects.filter(item_code=item_code).exists():
            errors["item_code"] = ["Item code already exists"]

        if not name:
            errors["name"] = ["Name is required"]

        category = None
        if not category_id:
            errors["category_id"] = ["Category is required"]
        else:
            try:
                category = ItemCategory.objects.get(pk=category_id)
            except ItemCategory.DoesNotExist:
                errors["category_id"] = ["Category does not exist"]

        unit = None
        if not unit_id:
            errors["unit_id"] = ["Unit is required"]
        else:
            try:
                unit = UnitOfMeasure.objects.get(pk=unit_id)
            except UnitOfMeasure.DoesNotExist:
                errors["unit_id"] = ["Unit does not exist"]

        if errors:
            return json_error("Validation failed", errors=errors)

        item = Item.objects.create(
            item_code=item_code,
            name=name,
            category=category,
            unit=unit,
            description=description,
            minimum_stock=min_stock
        )
        record_audit(
            user=request.user,
            model_name="Item",
            object_id=item.id,
            action="CREATE",
            new_values={
                "item_code": item.item_code,
                "name": item.name,
                "category": category.name,
                "unit": unit.short_name,
                "minimum_stock": str(item.minimum_stock)
            },
            description=f"Created Item '{item.name}' ({item.item_code})"
        )
        return json_success({
            "id": item.id,
            "item_code": item.item_code,
            "name": item.name,
            "category": {"id": category.id, "name": category.name},
            "unit": {"id": unit.id, "short_name": unit.short_name},
            "minimum_stock": str(item.minimum_stock),
            "is_active": item.is_active
        }, message="Item created successfully", status=201)

@require_http_methods(["GET", "PUT"])
@api_login_required
def item_detail_view(request, pk):
    try:
        item = Item.objects.select_related('category', 'unit').get(pk=pk)
    except Item.DoesNotExist:
        return json_error("Item not found", status=404)

    if request.method == "GET":
        stock_agg = item.inventory_lots.filter(status='AVAILABLE').aggregate(
            total_stock=Sum('available_quantity')
        )
        current_stock = stock_agg['total_stock'] or Decimal('0.000')

        return json_success({
            "id": item.id,
            "item_code": item.item_code,
            "name": item.name,
            "category": {"id": item.category.id, "name": item.category.name},
            "unit": {"id": item.unit.id, "name": item.unit.name, "short_name": item.unit.short_name},
            "description": item.description,
            "minimum_stock": str(item.minimum_stock),
            "current_stock": str(current_stock),
            "is_low_stock": current_stock <= item.minimum_stock if item.minimum_stock > 0 else False,
            "is_active": item.is_active,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        old_values = {
            "name": item.name,
            "category_id": item.category_id,
            "unit_id": item.unit_id,
            "minimum_stock": str(item.minimum_stock),
            "is_active": item.is_active
        }
        changed = []

        if "name" in data and data["name"].strip() and item.name != data["name"].strip():
            item.name = data["name"].strip()
            changed.append("name")

        if "category_id" in data and item.category_id != data["category_id"]:
            try:
                cat = ItemCategory.objects.get(pk=data["category_id"])
                item.category = cat
                changed.append("category")
            except ItemCategory.DoesNotExist:
                return json_error("Category does not exist", errors={"category_id": ["Invalid category"]})

        if "unit_id" in data and item.unit_id != data["unit_id"]:
            try:
                unit = UnitOfMeasure.objects.get(pk=data["unit_id"])
                item.unit = unit
                changed.append("unit")
            except UnitOfMeasure.DoesNotExist:
                return json_error("Unit does not exist", errors={"unit_id": ["Invalid unit"]})

        if "description" in data and item.description != data["description"].strip():
            item.description = data["description"].strip()
            changed.append("description")

        if "minimum_stock" in data:
            try:
                new_min = Decimal(str(data["minimum_stock"]))
                if new_min < 0:
                    raise InvalidOperation
                if item.minimum_stock != new_min:
                    item.minimum_stock = new_min
                    changed.append("minimum_stock")
            except (InvalidOperation, TypeError, ValueError):
                return json_error("Minimum stock must be a non-negative number", errors={"minimum_stock": ["Invalid value"]})

        if "is_active" in data and item.is_active != bool(data["is_active"]):
            item.is_active = bool(data["is_active"])
            changed.append("is_active")

        item.save()
        if changed:
            record_audit(
                user=request.user,
                model_name="Item",
                object_id=item.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values={
                    "name": item.name,
                    "category": item.category.name,
                    "unit": item.unit.short_name,
                    "minimum_stock": str(item.minimum_stock),
                    "is_active": item.is_active
                },
                description=f"Updated Item '{item.name}'"
            )

        return json_success({
            "id": item.id,
            "item_code": item.item_code,
            "name": item.name,
            "category": {"id": item.category.id, "name": item.category.name},
            "unit": {"id": item.unit.id, "short_name": item.unit.short_name},
            "minimum_stock": str(item.minimum_stock),
            "is_active": item.is_active
        }, message="Item updated successfully")

# ----------------- VENDORS -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def vendors_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        qs = Vendor.objects.all()
        if search:
            qs = qs.filter(
                Q(vendor_name__icontains=search) |
                Q(vendor_code__icontains=search) |
                Q(phone__icontains=search) |
                Q(contact_person__icontains=search)
            )
        paginated = paginate_queryset(qs, request)
        data = [{
            "id": v.id,
            "vendor_code": v.vendor_code,
            "vendor_name": v.vendor_name,
            "contact_person": v.contact_person,
            "phone": v.phone,
            "email": v.email,
            "address": v.address,
            "gst_number": v.gst_number,
            "is_active": v.is_active,
            "created_at": v.created_at
        } for v in paginated['items']]
        return json_success({"vendors": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        vendor_code = data.get("vendor_code", "").strip().upper()
        vendor_name = data.get("vendor_name", "").strip()

        errors = {}
        if not vendor_code:
            errors["vendor_code"] = ["Vendor code is required"]
        elif Vendor.objects.filter(vendor_code=vendor_code).exists():
            errors["vendor_code"] = ["Vendor code already exists"]

        if not vendor_name:
            errors["vendor_name"] = ["Vendor name is required"]

        if errors:
            return json_error("Validation failed", errors=errors)

        vendor = Vendor.objects.create(
            vendor_code=vendor_code,
            vendor_name=vendor_name,
            contact_person=data.get("contact_person", "").strip(),
            phone=data.get("phone", "").strip(),
            email=data.get("email", "").strip(),
            address=data.get("address", "").strip(),
            gst_number=data.get("gst_number", "").strip()
        )
        record_audit(
            user=request.user,
            model_name="Vendor",
            object_id=vendor.id,
            action="CREATE",
            new_values={"vendor_code": vendor.vendor_code, "vendor_name": vendor.vendor_name},
            description=f"Created Vendor '{vendor.vendor_name}' ({vendor.vendor_code})"
        )
        return json_success({
            "id": vendor.id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "is_active": vendor.is_active
        }, message="Vendor created successfully", status=201)

@require_http_methods(["GET", "PUT"])
@api_login_required
def vendor_detail_view(request, pk):
    try:
        vendor = Vendor.objects.get(pk=pk)
    except Vendor.DoesNotExist:
        return json_error("Vendor not found", status=404)

    if request.method == "GET":
        return json_success({
            "id": vendor.id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "contact_person": vendor.contact_person,
            "phone": vendor.phone,
            "email": vendor.email,
            "address": vendor.address,
            "gst_number": vendor.gst_number,
            "is_active": vendor.is_active,
            "created_at": vendor.created_at,
            "updated_at": vendor.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        old_values = {
            "vendor_name": vendor.vendor_name,
            "contact_person": vendor.contact_person,
            "phone": vendor.phone,
            "email": vendor.email,
            "is_active": vendor.is_active
        }
        changed = []

        if "vendor_name" in data and data["vendor_name"].strip() and vendor.vendor_name != data["vendor_name"].strip():
            vendor.vendor_name = data["vendor_name"].strip()
            changed.append("vendor_name")
        if "contact_person" in data and vendor.contact_person != data["contact_person"].strip():
            vendor.contact_person = data["contact_person"].strip()
            changed.append("contact_person")
        if "phone" in data and vendor.phone != data["phone"].strip():
            vendor.phone = data["phone"].strip()
            changed.append("phone")
        if "email" in data and vendor.email != data["email"].strip():
            vendor.email = data["email"].strip()
            changed.append("email")
        if "address" in data and vendor.address != data["address"].strip():
            vendor.address = data["address"].strip()
            changed.append("address")
        if "gst_number" in data and vendor.gst_number != data["gst_number"].strip():
            vendor.gst_number = data["gst_number"].strip()
            changed.append("gst_number")
        if "is_active" in data and vendor.is_active != bool(data["is_active"]):
            vendor.is_active = bool(data["is_active"])
            changed.append("is_active")

        vendor.save()
        if changed:
            record_audit(
                user=request.user,
                model_name="Vendor",
                object_id=vendor.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values={"vendor_name": vendor.vendor_name, "phone": vendor.phone, "is_active": vendor.is_active},
                description=f"Updated Vendor '{vendor.vendor_name}'"
            )
        return json_success({"id": vendor.id, "vendor_name": vendor.vendor_name}, message="Vendor updated successfully")

# ----------------- CUSTOMERS -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def customers_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        qs = Customer.objects.all()
        if search:
            qs = qs.filter(
                Q(customer_name__icontains=search) |
                Q(customer_code__icontains=search) |
                Q(phone__icontains=search)
            )
        paginated = paginate_queryset(qs, request)
        data = [{
            "id": c.id,
            "customer_code": c.customer_code,
            "customer_name": c.customer_name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "gst_number": c.gst_number,
            "is_active": c.is_active,
            "created_at": c.created_at
        } for c in paginated['items']]
        return json_success({"customers": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        customer_code = data.get("customer_code", "").strip().upper()
        customer_name = data.get("customer_name", "").strip()

        errors = {}
        if not customer_code:
            errors["customer_code"] = ["Customer code is required"]
        elif Customer.objects.filter(customer_code=customer_code).exists():
            errors["customer_code"] = ["Customer code already exists"]

        if not customer_name:
            errors["customer_name"] = ["Customer name is required"]

        if errors:
            return json_error("Validation failed", errors=errors)

        customer = Customer.objects.create(
            customer_code=customer_code,
            customer_name=customer_name,
            phone=data.get("phone", "").strip(),
            email=data.get("email", "").strip(),
            address=data.get("address", "").strip(),
            gst_number=data.get("gst_number", "").strip()
        )
        record_audit(
            user=request.user,
            model_name="Customer",
            object_id=customer.id,
            action="CREATE",
            new_values={"customer_code": customer.customer_code, "customer_name": customer.customer_name},
            description=f"Created Customer '{customer.customer_name}' ({customer.customer_code})"
        )
        return json_success({
            "id": customer.id,
            "customer_code": customer.customer_code,
            "customer_name": customer.customer_name,
            "is_active": customer.is_active
        }, message="Customer created successfully", status=201)

@require_http_methods(["GET", "PUT"])
@api_login_required
def customer_detail_view(request, pk):
    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return json_error("Customer not found", status=404)

    if request.method == "GET":
        return json_success({
            "id": customer.id,
            "customer_code": customer.customer_code,
            "customer_name": customer.customer_name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "gst_number": customer.gst_number,
            "is_active": customer.is_active,
            "created_at": customer.created_at,
            "updated_at": customer.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        old_values = {
            "customer_name": customer.customer_name,
            "phone": customer.phone,
            "email": customer.email,
            "is_active": customer.is_active
        }
        changed = []

        if "customer_name" in data and data["customer_name"].strip() and customer.customer_name != data["customer_name"].strip():
            customer.customer_name = data["customer_name"].strip()
            changed.append("customer_name")
        if "phone" in data and customer.phone != data["phone"].strip():
            customer.phone = data["phone"].strip()
            changed.append("phone")
        if "email" in data and customer.email != data["email"].strip():
            customer.email = data["email"].strip()
            changed.append("email")
        if "address" in data and customer.address != data["address"].strip():
            customer.address = data["address"].strip()
            changed.append("address")
        if "gst_number" in data and customer.gst_number != data["gst_number"].strip():
            customer.gst_number = data["gst_number"].strip()
            changed.append("gst_number")
        if "is_active" in data and customer.is_active != bool(data["is_active"]):
            customer.is_active = bool(data["is_active"])
            changed.append("is_active")

        customer.save()
        if changed:
            record_audit(
                user=request.user,
                model_name="Customer",
                object_id=customer.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values={"customer_name": customer.customer_name, "phone": customer.phone, "is_active": customer.is_active},
                description=f"Updated Customer '{customer.customer_name}'"
            )
        return json_success({"id": customer.id, "customer_name": customer.customer_name}, message="Customer updated successfully")

# ----------------- FARM PLOTS -----------------
@require_http_methods(["GET", "POST"])
@api_login_required
def farm_plots_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        qs = FarmPlot.objects.all()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(location__icontains=search))
        paginated = paginate_queryset(qs, request)
        data = [{
            "id": p.id,
            "name": p.name,
            "location": p.location,
            "area": str(p.area),
            "area_unit": p.area_unit,
            "description": p.description,
            "is_active": p.is_active,
            "created_at": p.created_at
        } for p in paginated['items']]
        return json_success({"plots": data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        name = data.get("name", "").strip()
        location = data.get("location", "").strip()
        area_unit = data.get("area_unit", "Acre").strip()
        description = data.get("description", "").strip()

        errors = {}
        if not name:
            errors["name"] = ["Plot name is required"]
        elif FarmPlot.objects.filter(name__iexact=name).exists():
            errors["name"] = ["Plot name already exists"]

        try:
            area = Decimal(str(data.get("area", "0")))
            if area <= 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            errors["area"] = ["Area must be a positive number"]

        if errors:
            return json_error("Validation failed", errors=errors)

        plot = FarmPlot.objects.create(
            name=name,
            location=location,
            area=area,
            area_unit=area_unit,
            description=description
        )
        record_audit(
            user=request.user,
            model_name="FarmPlot",
            object_id=plot.id,
            action="CREATE",
            new_values={"name": plot.name, "area": str(plot.area), "area_unit": plot.area_unit},
            description=f"Created Farm Plot '{plot.name}' ({plot.area} {plot.area_unit})"
        )
        return json_success({
            "id": plot.id,
            "name": plot.name,
            "area": str(plot.area),
            "area_unit": plot.area_unit,
            "is_active": plot.is_active
        }, message="Farm plot created successfully", status=201)

@require_http_methods(["GET", "PUT"])
@api_login_required
def farm_plot_detail_view(request, pk):
    try:
        plot = FarmPlot.objects.get(pk=pk)
    except FarmPlot.DoesNotExist:
        return json_error("Farm plot not found", status=404)

    if request.method == "GET":
        return json_success({
            "id": plot.id,
            "name": plot.name,
            "location": plot.location,
            "area": str(plot.area),
            "area_unit": plot.area_unit,
            "description": plot.description,
            "is_active": plot.is_active,
            "created_at": plot.created_at,
            "updated_at": plot.updated_at
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        old_values = {
            "name": plot.name,
            "area": str(plot.area),
            "area_unit": plot.area_unit,
            "is_active": plot.is_active
        }
        changed = []

        if "name" in data and data["name"].strip() and plot.name != data["name"].strip():
            plot.name = data["name"].strip()
            changed.append("name")
        if "location" in data and plot.location != data["location"].strip():
            plot.location = data["location"].strip()
            changed.append("location")
        if "area" in data:
            try:
                new_area = Decimal(str(data["area"]))
                if new_area <= 0:
                    raise InvalidOperation
                if plot.area != new_area:
                    plot.area = new_area
                    changed.append("area")
            except (InvalidOperation, TypeError, ValueError):
                return json_error("Area must be a positive number", errors={"area": ["Invalid value"]})
        if "area_unit" in data and plot.area_unit != data["area_unit"].strip():
            plot.area_unit = data["area_unit"].strip()
            changed.append("area_unit")
        if "description" in data and plot.description != data["description"].strip():
            plot.description = data["description"].strip()
            changed.append("description")
        if "is_active" in data and plot.is_active != bool(data["is_active"]):
            plot.is_active = bool(data["is_active"])
            changed.append("is_active")

        plot.save()
        if changed:
            record_audit(
                user=request.user,
                model_name="FarmPlot",
                object_id=plot.id,
                action="UPDATE",
                changed_fields=changed,
                old_values=old_values,
                new_values={"name": plot.name, "area": str(plot.area), "is_active": plot.is_active},
                description=f"Updated Farm Plot '{plot.name}'"
            )
        return json_success({"id": plot.id, "name": plot.name}, message="Farm plot updated successfully")
