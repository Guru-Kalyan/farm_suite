import re
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from accounts.models import SecuritySettings, UserProfile
from audit.services.audit_service import record_audit


def get_client_ip(request):
    """
    Extracts client IP address from standard headers.
    """
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    return request.META.get('REMOTE_ADDR')


def validate_password_policy(password):
    """
    Validates a password candidate against active SecuritySettings.
    Returns (is_valid: bool, error_message: str | None)
    """
    settings = SecuritySettings.get_settings()
    
    if len(password) < settings.min_password_length:
        return False, f"Password must be at least {settings.min_password_length} characters long."

    if settings.require_uppercase and not re.search(r'[A-Z]', password):
        return False, "Password must include at least one uppercase letter (A-Z)."

    if settings.require_lowercase and not re.search(r'[a-z]', password):
        return False, "Password must include at least one lowercase letter (a-z)."

    if settings.require_number and not re.search(r'\d', password):
        return False, "Password must include at least one number (0-9)."

    if settings.require_special_char and not re.search(r'[^a-zA-Z0-9]', password):
        return False, "Password must include at least one special character (e.g. !@#$%^&*)."

    return True, None


def authenticate_user(request, identifier, password):
    """
    Authenticates by username OR email.
    Enforces account lockout, active status checks, and logs audit events.
    Returns: (user, error_message, is_locked)
    """
    identifier = (identifier or "").strip()
    if not identifier or not password:
        return None, "Username/Email and password are required.", False

    # Find candidate user
    user = User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).first()
    ip_addr = get_client_ip(request)

    if not user:
        record_audit(
            user=None,
            model_name="User",
            object_id="unknown",
            action="FAILED_LOGIN",
            description=f"Failed login attempt for unknown user: '{identifier}'",
            ip_address=ip_addr
        )
        return None, "Invalid username/email or password.", False

    # Ensure profile exists
    profile, _ = UserProfile.objects.get_or_create(user=user)
    settings = SecuritySettings.get_settings()

    # Check lockout
    if profile.is_locked():
        remaining = int((profile.locked_until - timezone.now()).total_seconds() / 60) + 1
        record_audit(
            user=user,
            model_name="User",
            object_id=str(user.id),
            action="FAILED_LOGIN",
            description=f"Attempted login to locked account: {user.username}",
            ip_address=ip_addr
        )
        return None, f"Account is temporarily locked due to excessive failed attempts. Try again in {remaining} minute(s).", True

    # Check active status
    if not user.is_active:
        record_audit(
            user=user,
            model_name="User",
            object_id=str(user.id),
            action="FAILED_LOGIN",
            description=f"Attempted login to disabled account: {user.username}",
            ip_address=ip_addr
        )
        return None, "Your account has been deactivated. Please contact your Farm Suit administrator.", False

    # Verify credentials
    authenticated_user = authenticate(request, username=user.username, password=password)

    if not authenticated_user:
        profile.failed_login_attempts += 1
        now = timezone.now()
        locked = False
        msg = "Invalid username/email or password."

        if profile.failed_login_attempts >= settings.max_login_attempts:
            profile.locked_until = now + timedelta(minutes=settings.lockout_duration_minutes)
            locked = True
            msg = f"Account locked for {settings.lockout_duration_minutes} minutes due to {settings.max_login_attempts} failed login attempts."
        
        profile.save()

        record_audit(
            user=user,
            model_name="User",
            object_id=str(user.id),
            action="FAILED_LOGIN",
            description=f"Failed login attempt #{profile.failed_login_attempts} for user: {user.username}",
            ip_address=ip_addr
        )
        return None, msg, locked

    # Successful login: reset failed counters and update last login ip
    profile.failed_login_attempts = 0
    profile.locked_until = None
    profile.last_login_ip = ip_addr
    profile.save()

    record_audit(
        user=authenticated_user,
        model_name="User",
        object_id=str(authenticated_user.id),
        action="LOGIN",
        description=f"User {authenticated_user.username} logged in successfully",
        ip_address=ip_addr
    )

    return authenticated_user, None, False
