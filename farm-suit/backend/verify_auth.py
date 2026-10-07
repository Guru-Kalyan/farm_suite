import os
import sys
import django

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import json
from django.test import Client
from django.contrib.auth.models import User
from accounts.models import Role, Permission, UserProfile, UserPermission, SecuritySettings
from accounts.services.permission_service import (
    get_user_effective_permissions,
    has_permission,
    validate_admin_protection
)
from audit.models import AuditLog


def run_auth_verification():
    print("=" * 60)
    print("VERIFYING FARM SUIT AUTHENTICATION & RBAC PERMISSIONS")
    print("=" * 60)

    client = Client()

    # 1. Verify Admin user exists and has Admin role
    admin_user = User.objects.get(username="admin")
    profile, _ = UserProfile.objects.get_or_create(user=admin_user)
    admin_role = Role.objects.get(name="Admin")
    profile.role = admin_role
    profile.save()

    effective_admin_perms = get_user_effective_permissions(admin_user)
    assert len(effective_admin_perms) == Permission.objects.count(), "Admin must have all permissions!"
    print(f"✓ Admin has all {len(effective_admin_perms)} system permissions.")

    # 2. Test Admin Login via API
    res = client.post('/api/accounts/login/', json.dumps({
        "username": "admin",
        "password": "admin123"
    }), content_type="application/json")
    assert res.status_code == 200, f"Admin login failed: {res.content}"
    data = res.json()
    assert data["data"]["is_admin"] is True
    assert "sales.view" in data["data"]["permissions"]
    print("✓ Admin login successful via API; returned is_admin=True and permissions array.")

    # 3. Test Admin Creating User: Rahul Kumar (Accountant) with custom permission override
    accountant_role = Role.objects.get(name="Accountant")
    User.objects.filter(username="rahul").delete()

    res = client.post('/api/admin/users/', json.dumps({
        "username": "rahul",
        "email": "rahul@example.com",
        "first_name": "Rahul",
        "last_name": "Kumar",
        "employee_id": "EMP-1024",
        "phone": "+91 98765 43210",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role_id": accountant_role.id,
        "custom_permissions": [
            {"code": "inventory.view", "policy": "ALLOW"}  # Custom add
        ]
    }), content_type="application/json")
    assert res.status_code == 201, f"Failed to create user: {res.content}"
    rahul_user = User.objects.get(username="rahul")
    rahul_perms = get_user_effective_permissions(rahul_user)

    # Rahul should have Accountant perms + inventory.view
    assert "sales.view" in rahul_perms
    assert "invoices.create" in rahul_perms
    assert "inventory.view" in rahul_perms  # Custom ALLOW
    assert "crops.create" not in rahul_perms  # Not granted
    assert "audit_logs.view" not in rahul_perms  # Not granted (Admin only)
    print("✓ Created Accountant user 'Rahul Kumar' with custom ALLOW permission 'inventory.view'.")

    # 4. Test Non-Admin (Rahul) Login
    rahul_client = Client()
    res = rahul_client.post('/api/accounts/login/', json.dumps({
        "username": "rahul@example.com",  # Test login via EMAIL
        "password": "Password123!"
    }), content_type="application/json")
    assert res.status_code == 200, f"Rahul login by email failed: {res.content}"
    data = res.json()["data"]
    assert data["is_admin"] is False
    assert data["role"]["name"] == "Accountant"
    print("✓ Rahul logged in successfully via EMAIL identifier; is_admin=False.")

    # 5. TEST CRITICAL USER REQUIREMENT: Non-admin CANNOT view change history (403 Forbidden)
    res = rahul_client.get('/api/audit/timeline/SalesBill/1/')
    assert res.status_code == 403, f"Expected 403 Forbidden for non-admin audit timeline, got {res.status_code}"
    print("✓ CRITICAL REQUIREMENT VERIFIED: Non-admin calling audit timeline endpoint returned 403 Forbidden!")

    res = rahul_client.get('/api/audit/')
    assert res.status_code == 403, f"Expected 403 Forbidden for non-admin audit list, got {res.status_code}"
    print("✓ CRITICAL REQUIREMENT VERIFIED: Non-admin calling audit list endpoint returned 403 Forbidden!")

    # 6. Test Non-Admin CANNOT call Admin APIs (403 Forbidden)
    res = rahul_client.get('/api/admin/users/')
    assert res.status_code == 403, f"Expected 403 Forbidden for non-admin accessing /api/admin/users/, got {res.status_code}"
    print("✓ Admin User Management endpoint returned 403 Forbidden for non-admin.")

    # 7. Test Admin CAN view audit timeline
    res = client.get('/api/audit/timeline/SalesBill/1/')
    assert res.status_code == 200, f"Admin should be allowed to view timeline, got {res.status_code}"
    print("✓ Admin successfully accessed change history timeline.")

    # 8. Test Last Active Admin Protection
    try:
        validate_admin_protection(admin_user, "deactivate")
        assert False, "Should have raised ValueError for attempting to disable last active Admin!"
    except ValueError as e:
        print(f"✓ Last Admin Protection triggered correctly: {e}")

    # Test via API disable endpoint
    res = client.post(f'/api/admin/users/{admin_user.id}/disable/')
    assert res.status_code == 400, f"Expected 400 for disabling last admin, got {res.status_code}"
    print("✓ API correctly rejected disabling the last System Administrator.")

    # 9. Test Lockout Security
    settings = SecuritySettings.get_settings()
    settings.max_login_attempts = 3
    settings.lockout_duration_minutes = 10
    settings.save()

    test_client = Client()
    for attempt in range(2):
        res = test_client.post('/api/accounts/login/', json.dumps({
            "username": "rahul",
            "password": "WrongPassword!"
        }), content_type="application/json")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # 3rd attempt reaches max_login_attempts=3 and locks account
    res = test_client.post('/api/accounts/login/', json.dumps({
        "username": "rahul",
        "password": "WrongPassword!"
    }), content_type="application/json")
    assert res.status_code == 423, f"Expected 423 Locked on 3rd attempt, got {res.status_code}"

    # Subsequent attempt with correct password also rejected because account is locked
    res = test_client.post('/api/accounts/login/', json.dumps({
        "username": "rahul",
        "password": "Password123!"
    }), content_type="application/json")
    assert res.status_code == 423, f"Expected 423 Locked, got {res.status_code}"
    print("✓ Account lockout triggered after 3 failed attempts (returned 423 Locked).")

    # Re-enable / unlock user via Admin API
    res = client.post(f'/api/admin/users/{rahul_user.id}/enable/')
    assert res.status_code == 200
    rahul_user.refresh_from_db()
    assert rahul_user.profile.is_locked() is False
    print("✓ Admin successfully unlocked and enabled Rahul's account.")

    # 10. Verify Audit Log recorded all events
    logs_count = AuditLog.objects.filter(model_name="User").count()
    assert logs_count > 0
    print(f"✓ Audit log recorded {logs_count} user security and administration events.")

    print("=" * 60)
    print("ALL BACKEND AUTH & RBAC VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == '__main__':
    run_auth_verification()
