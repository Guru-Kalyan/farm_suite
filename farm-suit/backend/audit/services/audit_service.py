from audit.models import AuditLog

def record_audit(user, model_name, object_id, action, changed_fields=None, old_values=None, new_values=None, description=""):
    """
    Records an append-only audit log entry.
    Ensures all JSON values are serializable.
    """
    try:
        log = AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            model_name=str(model_name),
            object_id=str(object_id),
            action=action,
            changed_fields=changed_fields or [],
            old_values=old_values or {},
            new_values=new_values or {},
            description=description or ""
        )
        return log
    except Exception as e:
        # Logging failure should not silently break unless desired, but print for debugging
        print(f"[AUDIT LOG ERROR] Failed to record audit log: {e}")
        return None
