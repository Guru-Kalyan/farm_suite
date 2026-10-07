from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from audit.services.audit_service import record_audit
from accounts.models import UserProfile
from accounts.services.auth_service import (
    authenticate_user,
    validate_password_policy,
    get_client_ip
)
from accounts.services.permission_service import (
    get_user_effective_permissions
)


@require_http_methods(["GET"])
def csrf_view(request):
    token = get_token(request)
    return json_success({"csrfToken": token}, message="CSRF cookie set")


@require_http_methods(["POST"])
def login_view(request):
    data = parse_json_body(request)
    if data is None:
        return json_error("Invalid JSON body", status=400)

    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password", "")
    remember_me = bool(data.get("remember_me", False))

    if not identifier or not password:
        return json_error("Username/Email and password are required", errors={
            "username": ["Required"] if not identifier else [],
            "password": ["Required"] if not password else []
        }, status=400)

    user, error_msg, is_locked = authenticate_user(request, identifier, password)

    if not user:
        status_code = 423 if is_locked else 401
        return json_error(error_msg or "Invalid credentials", status=status_code)

    login(request, user)

    if remember_me:
        # 30 days session
        request.session.set_expiry(60 * 60 * 24 * 30)
    else:
        # Browser session
        request.session.set_expiry(0)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    effective_perms = list(get_user_effective_permissions(user))
    is_admin = user.is_superuser or (profile.role and profile.role.name == "Admin")

    return json_success({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "employee_id": profile.employee_id or "",
        "phone": profile.phone or "",
        "role": {
            "id": profile.role.id if profile.role else None,
            "name": profile.role.name if profile.role else "No Role"
        } if profile.role else None,
        "is_admin": is_admin,
        "force_password_change": profile.force_password_change,
        "permissions": effective_perms
    }, message="Login successful")


@require_http_methods(["POST"])
def logout_view(request):
    if request.user.is_authenticated:
        record_audit(
            user=request.user,
            model_name="User",
            object_id=str(request.user.id),
            action="LOGOUT",
            description=f"User {request.user.username} logged out",
            ip_address=get_client_ip(request)
        )
    logout(request)
    return json_success(message="Logout successful")


@require_http_methods(["GET"])
@api_login_required
def me_view(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)
    effective_perms = list(get_user_effective_permissions(user))
    is_admin = user.is_superuser or (profile.role and profile.role.name == "Admin")

    return json_success({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "employee_id": profile.employee_id or "",
        "phone": profile.phone or "",
        "role": {
            "id": profile.role.id if profile.role else None,
            "name": profile.role.name if profile.role else "No Role"
        } if profile.role else None,
        "is_admin": is_admin,
        "force_password_change": profile.force_password_change,
        "permissions": effective_perms
    }, message="Current user profile retrieved")


@require_http_methods(["POST"])
@api_login_required
def change_password_view(request):
    data = parse_json_body(request)
    if not data:
        return json_error("Invalid JSON body", status=400)

    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # If force_password_change is true, current_password can be optional if admin reset it
    if not profile.force_password_change:
        if not user.check_password(current_password):
            return json_error("Current password is incorrect.", status=400)

    if not new_password:
        return json_error("New password is required.", status=400)

    if new_password != confirm_password:
        return json_error("New password and confirm password do not match.", status=400)

    is_valid, err_msg = validate_password_policy(new_password)
    if not is_valid:
        return json_error(err_msg, status=400)

    user.set_password(new_password)
    user.save()

    profile.force_password_change = False
    profile.save()

    # Prevent user from being logged out after password change
    update_session_auth_hash(request, user)

    record_audit(
        user=user,
        model_name="User",
        object_id=str(user.id),
        action="PASSWORD_RESET",
        description=f"User {user.username} updated their password",
        ip_address=get_client_ip(request)
    )

    return json_success(message="Password successfully changed.")


@require_http_methods(["POST"])
def forgot_password_view(request):
    data = parse_json_body(request) or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("username") or "").strip()

    if identifier:
        user = User.objects.filter(username__iexact=identifier).first() or User.objects.filter(email__iexact=identifier).first()
        if user:
            record_audit(
                user=user,
                model_name="User",
                object_id=str(user.id),
                action="UPDATE",
                description=f"Forgot password request initiated for {user.username}",
                ip_address=get_client_ip(request)
            )

    return json_success(
        message="Password reset request received. Please contact your Farm Suit system administrator to receive a temporary reset password."
    )
