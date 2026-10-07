import secrets
import string
from django.db import transaction
from django.db.models import Q, Count
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import admin_required, parse_json_body
from masters.views import paginate_queryset
from audit.models import AuditLog
from audit.services.audit_service import record_audit
from accounts.models import Role, Permission, RolePermission, UserProfile, UserPermission, SecuritySettings
from accounts.services.permission_service import (
    get_user_effective_permissions,
    validate_admin_protection,
    get_user_access_summary
)
from accounts.services.auth_service import validate_password_policy, get_client_ip


def _serialize_user_summary(u):
    profile = getattr(u, 'profile', None)
    role_info = {
        "id": profile.role.id,
        "name": profile.role.name
    } if profile and profile.role else None

    # Status: Locked, Disabled, Active
    status = "active"
    if not u.is_active:
        status = "disabled"
    elif profile and profile.is_locked():
        status = "locked"

    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": f"{u.first_name} {u.last_name}".strip() or u.username,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "status": status,
        "role": role_info,
        "employee_id": profile.employee_id if profile else "",
        "phone": profile.phone if profile else "",
        "last_login": u.last_login.strftime('%Y-%m-%d %H:%M:%S') if u.last_login else None,
        "date_joined": u.date_joined.strftime('%Y-%m-%d %H:%M:%S') if u.date_joined else None,
    }


# ==============================================================================
# USER MANAGEMENT
# ==============================================================================

@require_http_methods(["GET", "POST"])
@admin_required
def admin_users_view(request):
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        role_filter = request.GET.get("role", "").strip()
        status_filter = request.GET.get("status", "").strip().lower()

        qs = User.objects.select_related('profile', 'profile__role').all().order_by('-date_joined')

        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(profile__employee_id__icontains=search) |
                Q(profile__phone__icontains=search)
            )

        if role_filter:
            if role_filter.isdigit():
                qs = qs.filter(profile__role__id=int(role_filter))
            else:
                qs = qs.filter(profile__role__name__iexact=role_filter)

        if status_filter == "disabled":
            qs = qs.filter(is_active=False)
        elif status_filter == "active":
            qs = qs.filter(is_active=True)

        paginated = paginate_queryset(qs, request)
        users_data = [_serialize_user_summary(u) for u in paginated['items']]

        # If locked filter was requested
        if status_filter == "locked":
            users_data = [u for u in users_data if u['status'] == 'locked']

        return json_success({"users": users_data, "pagination": paginated['pagination']})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        phone = data.get("phone", "").strip()
        employee_id = data.get("employee_id", "").strip()
        password = data.get("password", "")
        confirm_password = data.get("confirm_password", "")
        force_password_change = bool(data.get("force_password_change", False))
        role_id = data.get("role_id")
        custom_permissions = data.get("custom_permissions", [])  # list of { code, policy }

        errors = {}
        if not username:
            errors["username"] = ["Username is required."]
        elif User.objects.filter(username__iexact=username).exists():
            errors["username"] = ["A user with this username already exists."]

        if email and User.objects.filter(email__iexact=email).exists():
            errors["email"] = ["A user with this email already exists."]

        if not password:
            errors["password"] = ["Password is required."]
        elif password != confirm_password:
            errors["confirm_password"] = ["Passwords do not match."]
        else:
            is_valid, pwd_err = validate_password_policy(password)
            if not is_valid:
                errors["password"] = [pwd_err]

        if errors:
            return json_error("Validation failed", errors=errors, status=400)

        role = None
        if role_id:
            role = Role.objects.filter(id=role_id).first() or Role.objects.filter(name__iexact=str(role_id)).first()

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_staff=True if role and role.name == 'Admin' else False,
                is_superuser=True if role and role.name == 'Admin' else False
            )

            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "role": role,
                    "phone": phone,
                    "employee_id": employee_id,
                    "force_password_change": force_password_change
                }
            )

            # Apply custom permissions
            if isinstance(custom_permissions, list):
                for item in custom_permissions:
                    pcode = item.get("code") if isinstance(item, dict) else item
                    policy = item.get("policy", "ALLOW") if isinstance(item, dict) else "ALLOW"
                    perm = Permission.objects.filter(code=pcode).first()
                    if perm:
                        UserPermission.objects.create(
                            user=user,
                            permission=perm,
                            policy=policy
                        )

            record_audit(
                user=request.user,
                model_name="User",
                object_id=str(user.id),
                action="CREATE",
                new_values={
                    "username": username,
                    "email": email,
                    "role": role.name if role else None,
                    "employee_id": employee_id
                },
                description=f"Admin created user {user.username} with role '{role.name if role else 'None'}'",
                ip_address=get_client_ip(request)
            )

        return json_success(_serialize_user_summary(user), message=f"User {user.username} created successfully.", status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
@admin_required
def admin_user_detail_view(request, user_id):
    user = User.objects.filter(id=user_id).select_related('profile', 'profile__role').first()
    if not user:
        return json_error("User not found.", status=404)

    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == "GET":
        summary = _serialize_user_summary(user)
        access_summary = get_user_access_summary(user)
        effective_perms = list(get_user_effective_permissions(user))
        custom_perms = [
            {"code": up.permission.code, "policy": up.policy, "name": up.permission.name, "module": up.permission.module}
            for up in UserPermission.objects.filter(user=user).select_related('permission')
        ]

        recent_logs = AuditLog.objects.filter(
            Q(user=user) | Q(model_name="User", object_id=str(user.id))
        ).order_by('-timestamp')[:15]

        audit_data = [{
            "id": log.id,
            "action": log.action,
            "timestamp": log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            "description": log.description,
            "ip_address": log.ip_address
        } for log in recent_logs]

        return json_success({
            "user": summary,
            "effective_permissions": effective_perms,
            "custom_permissions": custom_perms,
            "access_summary": access_summary,
            "recent_activity": audit_data
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        old_role_name = profile.role.name if profile.role else "None"
        old_active = user.is_active

        # Validate updates
        email = data.get("email", user.email).strip()
        first_name = data.get("first_name", user.first_name).strip()
        last_name = data.get("last_name", user.last_name).strip()
        phone = data.get("phone", profile.phone or "").strip()
        employee_id = data.get("employee_id", profile.employee_id or "").strip()
        is_active = data.get("is_active", user.is_active)
        role_id = data.get("role_id")
        force_password_change = data.get("force_password_change", profile.force_password_change)
        custom_permissions = data.get("custom_permissions")

        if email and User.objects.filter(email__iexact=email).exclude(id=user.id).exists():
            return json_error("Email already in use by another account.", errors={"email": ["Already taken"]}, status=400)

        # Admin protection check if changing role or deactivating
        if not is_active and old_active:
            try:
                validate_admin_protection(user, "deactivate")
            except ValueError as e:
                return json_error(str(e), status=400)

        new_role = profile.role
        if role_id is not None:
            new_role = Role.objects.filter(id=role_id).first() or Role.objects.filter(name__iexact=str(role_id)).first()
            if old_role_name == "Admin" and (not new_role or new_role.name != "Admin"):
                try:
                    validate_admin_protection(user, "demote")
                except ValueError as e:
                    return json_error(str(e), status=400)

        with transaction.atomic():
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.is_active = is_active
            if new_role and new_role.name == "Admin":
                user.is_staff = True
                user.is_superuser = True
            elif role_id is not None:
                user.is_staff = False
                user.is_superuser = False
            user.save()

            profile.role = new_role
            profile.phone = phone
            profile.employee_id = employee_id
            profile.force_password_change = bool(force_password_change)
            profile.save()

            if custom_permissions is not None and isinstance(custom_permissions, list):
                UserPermission.objects.filter(user=user).delete()
                for item in custom_permissions:
                    pcode = item.get("code") if isinstance(item, dict) else item
                    policy = item.get("policy", "ALLOW") if isinstance(item, dict) else "ALLOW"
                    perm = Permission.objects.filter(code=pcode).first()
                    if perm:
                        UserPermission.objects.create(user=user, permission=perm, policy=policy)

            record_audit(
                user=request.user,
                model_name="User",
                object_id=str(user.id),
                action="UPDATE",
                old_values={"role": old_role_name, "is_active": old_active},
                new_values={"role": new_role.name if new_role else "None", "is_active": is_active},
                description=f"Admin updated user {user.username}",
                ip_address=get_client_ip(request)
            )

        return json_success(_serialize_user_summary(user), message="User updated successfully.")

    elif request.method == "DELETE":
        try:
            validate_admin_protection(user, "delete")
        except ValueError as e:
            return json_error(str(e), status=400)

        username = user.username
        with transaction.atomic():
            # For audit trail safety, soft-deactivate and dissociate
            user.is_active = False
            user.save()
            profile.role = None
            profile.save()

            record_audit(
                user=request.user,
                model_name="User",
                object_id=str(user.id),
                action="DELETE",
                description=f"Admin deleted / deactivated user {username}",
                ip_address=get_client_ip(request)
            )

        return json_success(message=f"User {username} deactivated successfully.")


@require_http_methods(["POST"])
@admin_required
def admin_user_disable_view(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return json_error("User not found.", status=404)

    try:
        validate_admin_protection(user, "disable")
    except ValueError as e:
        return json_error(str(e), status=400)

    user.is_active = False
    user.save()

    record_audit(
        user=request.user,
        model_name="User",
        object_id=str(user.id),
        action="DISABLE",
        description=f"Admin disabled account for user {user.username}",
        ip_address=get_client_ip(request)
    )

    return json_success(_serialize_user_summary(user), message=f"User {user.username} has been disabled.")


@require_http_methods(["POST"])
@admin_required
def admin_user_enable_view(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return json_error("User not found.", status=404)

    user.is_active = True
    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.failed_login_attempts = 0
    profile.locked_until = None
    profile.save()

    record_audit(
        user=request.user,
        model_name="User",
        object_id=str(user.id),
        action="ENABLE",
        description=f"Admin enabled account for user {user.username}",
        ip_address=get_client_ip(request)
    )

    return json_success(_serialize_user_summary(user), message=f"User {user.username} has been enabled.")


@require_http_methods(["POST"])
@admin_required
def admin_user_reset_password_view(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return json_error("User not found.", status=404)

    data = parse_json_body(request) or {}
    new_password = data.get("password", "").strip()
    force_change = bool(data.get("force_password_change", True))

    generated = False
    if not new_password:
        # Generate secure random temporary password
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        new_password = ''.join(secrets.choice(alphabet) for _ in range(10))
        generated = True
    else:
        is_valid, err_msg = validate_password_policy(new_password)
        if not is_valid:
            return json_error(err_msg, status=400)

    user.set_password(new_password)
    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.force_password_change = force_change
    profile.failed_login_attempts = 0
    profile.locked_until = None
    profile.save()

    record_audit(
        user=request.user,
        model_name="User",
        object_id=str(user.id),
        action="PASSWORD_RESET",
        description=f"Admin reset password for user {user.username} (force_change={force_change})",
        ip_address=get_client_ip(request)
    )

    return json_success({
        "username": user.username,
        "temporary_password": new_password if generated else None,
        "force_password_change": force_change
    }, message=f"Password for user {user.username} has been reset successfully.")


# ==============================================================================
# ROLES & PERMISSIONS
# ==============================================================================

@require_http_methods(["GET", "POST"])
@admin_required
def admin_roles_view(request):
    if request.method == "GET":
        roles = Role.objects.annotate(
            users_count=Count('users', distinct=True),
            permissions_count=Count('role_permissions', distinct=True)
        ).all().order_by('name')

        data = [{
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_system": r.is_system,
            "users_count": r.users_count,
            "permissions_count": r.permissions_count,
            "created_at": r.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        } for r in roles]

        return json_success({"roles": data})

    elif request.method == "POST":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        name = data.get("name", "").strip()
        description = data.get("description", "").strip()
        permissions = data.get("permissions", [])  # list of permission codes

        if not name:
            return json_error("Role name is required.", status=400)

        if Role.objects.filter(name__iexact=name).exists():
            return json_error("A role with this name already exists.", status=400)

        with transaction.atomic():
            role = Role.objects.create(name=name, description=description, is_system=False)

            for pcode in permissions:
                perm = Permission.objects.filter(code=pcode).first()
                if perm:
                    RolePermission.objects.create(role=role, permission=perm)

            record_audit(
                user=request.user,
                model_name="Role",
                object_id=str(role.id),
                action="CREATE",
                description=f"Admin created custom role '{role.name}' with {len(permissions)} permissions",
                ip_address=get_client_ip(request)
            )

        return json_success({"id": role.id, "name": role.name}, message=f"Role '{role.name}' created.", status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
@admin_required
def admin_role_detail_view(request, role_id):
    role = Role.objects.filter(id=role_id).first()
    if not role:
        return json_error("Role not found.", status=404)

    if request.method == "GET":
        assigned_perms = list(role.role_permissions.values_list('permission__code', flat=True))
        return json_success({
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "is_system": role.is_system,
            "permissions": assigned_perms,
            "created_at": role.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        name = data.get("name", role.name).strip()
        description = data.get("description", role.description).strip()
        permissions = data.get("permissions")

        if not name:
            return json_error("Role name is required.", status=400)

        if role.is_system and name != role.name:
            return json_error("System roles cannot be renamed.", status=400)

        if Role.objects.filter(name__iexact=name).exclude(id=role.id).exists():
            return json_error("Role name already in use.", status=400)

        with transaction.atomic():
            role.name = name
            role.description = description
            role.save()

            if permissions is not None and isinstance(permissions, list):
                RolePermission.objects.filter(role=role).delete()
                for pcode in permissions:
                    perm = Permission.objects.filter(code=pcode).first()
                    if perm:
                        RolePermission.objects.create(role=role, permission=perm)

            record_audit(
                user=request.user,
                model_name="Role",
                object_id=str(role.id),
                action="UPDATE",
                description=f"Admin updated role '{role.name}'",
                ip_address=get_client_ip(request)
            )

        return json_success({"id": role.id, "name": role.name}, message=f"Role '{role.name}' updated.")

    elif request.method == "DELETE":
        if role.is_system:
            return json_error("System roles cannot be deleted.", status=400)

        if role.users.exists():
            return json_error("Cannot delete a role that is currently assigned to users.", status=400)

        role_name = role.name
        with transaction.atomic():
            role.delete()
            record_audit(
                user=request.user,
                model_name="Role",
                object_id=str(role_id),
                action="DELETE",
                description=f"Admin deleted role '{role_name}'",
                ip_address=get_client_ip(request)
            )

        return json_success(message=f"Role '{role_name}' deleted.")


@require_http_methods(["GET"])
@admin_required
def admin_permissions_view(request):
    """
    Returns all permissions grouped by module with details.
    """
    all_perms = Permission.objects.all().order_by('module', 'name')
    modules = {}

    for p in all_perms:
        if p.module not in modules:
            modules[p.module] = []
        modules[p.module].append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "module": p.module,
            "description": p.description
        })

    result = [{"module": mod, "permissions": perms} for mod, perms in modules.items()]
    return json_success({"modules": result, "total": all_perms.count()})


# ==============================================================================
# SECURITY SETTINGS
# ==============================================================================

@require_http_methods(["GET", "PUT"])
@admin_required
def admin_security_settings_view(request):
    settings = SecuritySettings.get_settings()

    if request.method == "GET":
        return json_success({
            "min_password_length": settings.min_password_length,
            "require_uppercase": settings.require_uppercase,
            "require_lowercase": settings.require_lowercase,
            "require_number": settings.require_number,
            "require_special_char": settings.require_special_char,
            "max_login_attempts": settings.max_login_attempts,
            "lockout_duration_minutes": settings.lockout_duration_minutes,
            "session_timeout_minutes": settings.session_timeout_minutes,
            "allow_multiple_sessions": settings.allow_multiple_sessions,
            "force_logout_inactivity": settings.force_logout_inactivity,
            "updated_at": settings.updated_at.strftime('%Y-%m-%d %H:%M:%S') if settings.updated_at else None
        })

    elif request.method == "PUT":
        data = parse_json_body(request)
        if not data:
            return json_error("Invalid JSON body", status=400)

        min_len = int(data.get("min_password_length", settings.min_password_length))
        max_attempts = int(data.get("max_login_attempts", settings.max_login_attempts))
        lockout_dur = int(data.get("lockout_duration_minutes", settings.lockout_duration_minutes))
        session_timeout = int(data.get("session_timeout_minutes", settings.session_timeout_minutes))

        if min_len < 4 or min_len > 32:
            return json_error("Minimum password length must be between 4 and 32.", status=400)
        if max_attempts < 1 or max_attempts > 20:
            return json_error("Max login attempts must be between 1 and 20.", status=400)

        old_values = {
            "min_password_length": settings.min_password_length,
            "max_login_attempts": settings.max_login_attempts
        }

        settings.min_password_length = min_len
        settings.require_uppercase = bool(data.get("require_uppercase", settings.require_uppercase))
        settings.require_lowercase = bool(data.get("require_lowercase", settings.require_lowercase))
        settings.require_number = bool(data.get("require_number", settings.require_number))
        settings.require_special_char = bool(data.get("require_special_char", settings.require_special_char))
        settings.max_login_attempts = max_attempts
        settings.lockout_duration_minutes = lockout_dur
        settings.session_timeout_minutes = session_timeout
        settings.allow_multiple_sessions = bool(data.get("allow_multiple_sessions", settings.allow_multiple_sessions))
        settings.force_logout_inactivity = bool(data.get("force_logout_inactivity", settings.force_logout_inactivity))
        settings.updated_by = request.user
        settings.save()

        record_audit(
            user=request.user,
            model_name="SecuritySettings",
            object_id=str(settings.id),
            action="UPDATE",
            old_values=old_values,
            new_values={
                "min_password_length": min_len,
                "max_login_attempts": max_attempts
            },
            description="Admin updated system security settings",
            ip_address=get_client_ip(request)
        )

        return json_success(message="Security settings updated successfully.")


# ==============================================================================
# AUDIT LOGS (ADMIN ONLY)
# ==============================================================================

@require_http_methods(["GET"])
@admin_required
def admin_audit_logs_view(request):
    """
    Returns global audit logs with advanced filtering. Admin only.
    """
    model_name = request.GET.get("model_name", "").strip()
    action = request.GET.get("action", "").strip().upper()
    search = request.GET.get("search", "").strip()
    user_id = request.GET.get("user_id", "").strip()

    qs = AuditLog.objects.select_related('user').all()

    if model_name:
        qs = qs.filter(model_name__iexact=model_name)
    if action:
        qs = qs.filter(action=action)
    if user_id and user_id.isdigit():
        qs = qs.filter(user__id=int(user_id))
    if search:
        qs = qs.filter(
            Q(description__icontains=search) |
            Q(object_id__icontains=search) |
            Q(model_name__icontains=search) |
            Q(user__username__icontains=search) |
            Q(action__icontains=search)
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
