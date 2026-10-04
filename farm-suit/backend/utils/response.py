from django.http import JsonResponse
from decimal import Decimal
import datetime

def custom_json_serializer(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

def json_success(data=None, message="Operation completed successfully", status=200):
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    return JsonResponse(payload, status=status, safe=False, json_dumps_params={'default': custom_json_serializer})

def json_error(message="An error occurred", errors=None, status=400):
    payload = {
        "success": False,
        "message": message,
        "errors": errors if errors is not None else {}
    }
    return JsonResponse(payload, status=status)
