import base64
import datetime
import secrets
from django.utils import timezone
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body
from utils.email_service import send_admin_reset_email
from audit.services.audit_service import record_audit
from accounts.models import UserProfile, PasswordResetToken, PasswordResetRequest
from accounts.services.auth_service import (
    authenticate_user,
    validate_password_policy,
    get_client_ip
)
from accounts.services.permission_service import (
    get_user_effective_permissions
)


def decode_password_if_encoded(val, is_encoded=False):
    if not val or not is_encoded:
        return val
    try:
        return base64.b64decode(val).decode('utf-8')
    except Exception:
        return val


@require_http_methods(["GET"])
def csrf_view(request):
    token = get_token(request)
    return json_success({"csrfToken": token}, message="CSRF cookie set")


@require_http_methods(["POST"])
def login_view(request):
    data = parse_json_body(request)
    if data is None:
        return json_error("Invalid JSON body", status=400)

    # 1. Check for single-key p_key payload: encodeBase64(username:encodeBase64(password))
    raw_p_key = data.get("p_key")
    if raw_p_key:
        try:
            decoded_combined = base64.b64decode(raw_p_key).decode('utf-8')
            identifier, encoded_pass = decoded_combined.split(':', 1)
            identifier = identifier.strip()
            password = base64.b64decode(encoded_pass).decode('utf-8')
        except Exception:
            return json_error("Invalid p_key payload format", status=400)
    else:
        # Fallback to standard username/password for backwards compatibility
        identifier = (data.get("username") or data.get("email") or "").strip()
        raw_password = data.get("password", "")
        is_encoded = bool(data.get("is_encoded", False))
        password = decode_password_if_encoded(raw_password, is_encoded)

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

    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    is_encoded = bool(data.get("is_encoded", False))
    current_password = decode_password_if_encoded(data.get("current_password", ""), is_encoded)
    new_password = decode_password_if_encoded(data.get("new_password", ""), is_encoded)
    confirm_password = decode_password_if_encoded(data.get("confirm_password", ""), is_encoded)

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

    # Invalidate any unused reset tokens and pending reset requests for this user
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
    PasswordResetRequest.objects.filter(user=user, status='PENDING').update(
        status='RESOLVED', resolved_at=timezone.now(), resolved_by=user
    )

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

    if not identifier:
        return json_error("Please enter your username or registered email address.", status=400)

    user = User.objects.filter(username__iexact=identifier).first() or User.objects.filter(email__iexact=identifier).first()

    if not user:
        return json_success(
            data={"exists": False},
            message="If an account matches that username or email, recovery instructions have been initiated."
        )

    ip = get_client_ip(request)
    is_admin = user.is_superuser or (hasattr(user, 'profile') and user.profile.role and user.profile.role.name == 'Admin')

    if is_admin:
        # Generate 6-digit cryptographic PIN for Admin
        reset_key = f"{secrets.randbelow(900000) + 100000:06d}"

        # Invalidate previous unused tokens for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        # Create 15-minute token
        PasswordResetToken.objects.create(
            user=user,
            reset_key=reset_key,
            expires_at=timezone.now() + datetime.timedelta(minutes=15),
            created_by_admin=None,
            ip_address=ip
        )

        target_email = user.email.strip() if user.email else "gurukalyan786@gmail.com"
        email_sent, err_msg = send_admin_reset_email(
            recipient_email=target_email,
            reset_key=reset_key,
            admin_username=user.first_name or user.username,
            expires_minutes=15
        )

        # Mask email for privacy
        parts = target_email.split('@')
        masked_email = f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}" if len(parts) == 2 and len(parts[0]) > 2 else target_email

        record_audit(
            user=user,
            model_name="User",
            object_id=str(user.id),
            action="UPDATE",
            description=f"Admin password reset key sent via SMTP to {target_email} (success: {email_sent})",
            ip_address=ip
        )

        if not email_sent:
            return json_error(f"Failed to send reset email: {err_msg}", status=500)

        return json_success(
            data={
                "is_admin": True,
                "username": user.username,
                "masked_email": masked_email
            },
            message=f"A 6-digit password reset key has been sent to your registered email ({masked_email}). Please check your inbox."
        )
    else:
        # Regular staff user: Record pending PasswordResetRequest for the Administrator
        reset_req, _ = PasswordResetRequest.objects.get_or_create(
            user=user,
            status='PENDING',
            defaults={'ip_address': ip}
        )

        record_audit(
            user=user,
            model_name="User",
            object_id=str(user.id),
            action="UPDATE",
            description=f"Staff user {user.username} submitted password reset request to Administrator",
            ip_address=ip
        )

        return json_success(
            data={
                "is_admin": False,
                "username": user.username,
                "request_id": reset_req.id
            },
            message="Your password reset request has been sent to the Administrator. The Administrator will reset your account password directly."
        )


@require_http_methods(["POST"])
def verify_reset_key_view(request):
    data = parse_json_body(request) or {}
    identifier = (data.get("identifier") or data.get("username") or "").strip()
    reset_key = (data.get("reset_key") or data.get("key") or "").strip()

    if not identifier or not reset_key:
        return json_error("Identifier and reset key are required.", status=400)

    user = User.objects.filter(username__iexact=identifier).first() or User.objects.filter(email__iexact=identifier).first()
    if not user:
        return json_error("Invalid user or reset key.", status=400)

    token = PasswordResetToken.objects.filter(
        user=user,
        reset_key=reset_key,
        is_used=False,
        expires_at__gt=timezone.now()
    ).first()

    if not token:
        return json_error("Invalid or expired password reset key.", status=400)

    return json_success(
        data={"username": user.username, "is_valid": True},
        message="Reset key is valid."
    )


@require_http_methods(["POST"])
def reset_password_with_key_view(request):
    data = parse_json_body(request) or {}
    identifier = (data.get("identifier") or data.get("username") or "").strip()
    reset_key = (data.get("reset_key") or data.get("key") or "").strip()
    is_encoded = bool(data.get("is_encoded", False))
    new_password = decode_password_if_encoded(data.get("new_password", ""), is_encoded).strip()
    confirm_password = decode_password_if_encoded(data.get("confirm_password", ""), is_encoded).strip()

    if not identifier or not reset_key:
        return json_error("Identifier and reset key are required.", status=400)

    if not new_password:
        return json_error("New password is required.", status=400)

    if new_password != confirm_password:
        return json_error("New password and confirm password do not match.", status=400)

    user = User.objects.filter(username__iexact=identifier).first() or User.objects.filter(email__iexact=identifier).first()
    if not user:
        return json_error("User not found.", status=404)

    token = PasswordResetToken.objects.filter(
        user=user,
        reset_key=reset_key,
        is_used=False,
        expires_at__gt=timezone.now()
    ).first()

    if not token:
        return json_error("The password reset key is invalid or has expired. Please request a new one.", status=400)

    is_valid, err_msg = validate_password_policy(new_password)
    if not is_valid:
        return json_error(err_msg, status=400)

    # Update password
    user.set_password(new_password)
    user.save()

    # Clear lockout and force change flag
    if hasattr(user, 'profile'):
        user.profile.force_password_change = False
        user.profile.failed_login_attempts = 0
        user.profile.locked_until = None
        user.profile.save()

    # Mark token used & invalidate all tokens for user
    token.is_used = True
    token.save()
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
    PasswordResetRequest.objects.filter(user=user, status='PENDING').update(
        status='RESOLVED', resolved_at=timezone.now(), resolved_by=user
    )

    ip = get_client_ip(request)
    record_audit(
        user=user,
        model_name="User",
        object_id=str(user.id),
        action="PASSWORD_RESET",
        description=f"Password successfully reset via recovery key for user {user.username}",
        ip_address=ip
    )

    return json_success(message="Password reset successfully! You can now sign in with your new password.")

