import functools
import json
from .response import json_error

def api_login_required(view_func):
    @functools.wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return json_error("Authentication required. Please log in.", status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def parse_json_body(request):
    try:
        if request.body:
            return json.loads(request.body.decode('utf-8'))
        return {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
