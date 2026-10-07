import functools
import json
from .response import json_error


def api_login_required(view_func):
    @functools.wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return json_error("Authentication required. Please log in.", status=401)
        if not request.user.is_active:
            return json_error("Account is disabled. Please contact your Farm Suit administrator.", status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def permission_required(perm_code):
    def decorator(view_func):
        @functools.wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return json_error("Authentication required. Please log in.", status=401)
            if not request.user.is_active:
                return json_error("Account is disabled. Please contact your Farm Suit administrator.", status=403)
            
            # Lazy import to avoid circular dependency
            from accounts.services.permission_service import has_permission
            if not has_permission(request.user, perm_code):
                return json_error("Forbidden: You do not have permission to perform this action.", status=403)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def admin_required(view_func):
    @functools.wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return json_error("Authentication required. Please log in.", status=401)
        if not request.user.is_active:
            return json_error("Account is disabled. Please contact your Farm Suit administrator.", status=403)
        
        is_admin = request.user.is_superuser
        if hasattr(request.user, 'profile') and request.user.profile and request.user.profile.role:
            if request.user.profile.role.name == 'Admin':
                is_admin = True
        
        if not is_admin:
            return json_error("Forbidden: Administrator access required.", status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def parse_json_body(request):
    try:
        if request.body:
            return json.loads(request.body.decode('utf-8'))
        return {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
