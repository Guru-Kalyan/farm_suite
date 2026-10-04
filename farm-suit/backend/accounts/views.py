from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods
from utils.response import json_success, json_error
from utils.decorators import api_login_required, parse_json_body

@require_http_methods(["GET"])
def csrf_view(request):
    token = get_token(request)
    return json_success({"csrfToken": token}, message="CSRF cookie set")

@require_http_methods(["POST"])
def login_view(request):
    data = parse_json_body(request)
    if data is None:
        return json_error("Invalid JSON body", status=400)
    
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return json_error("Username and password are required", errors={
            "username": ["Required"] if not username else [],
            "password": ["Required"] if not password else []
        }, status=400)
    
    user = authenticate(request, username=username, password=password)
    if user is not None:
        if not user.is_active:
            return json_error("User account is inactive", status=403)
        login(request, user)
        return json_success({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_superuser": user.is_superuser,
            "is_staff": user.is_staff
        }, message="Login successful")
    
    return json_error("Invalid username or password", status=401)

@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return json_success(message="Logout successful")

@require_http_methods(["GET"])
@api_login_required
def me_view(request):
    user = request.user
    return json_success({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff
    }, message="Current user profile retrieved")
