from django.db.models import Q
from django.contrib.auth.models import User
from accounts.models import Permission, RolePermission, UserPermission, UserProfile


def get_user_effective_permissions(user):
    """
    Computes the final effective set of permission codes for a user.
    Logic:
      1. If user is superuser or has 'Admin' role, returns ALL system permission codes.
      2. If user has a role, collects default permissions from that Role.
      3. Overrides with custom UserPermission records:
         - 'ALLOW': adds permission
         - 'DENY': removes permission
    """
    if not user or not user.is_authenticated or not user.is_active:
        return set()

    # Admins have full access to everything
    is_admin = user.is_superuser
    if hasattr(user, 'profile') and user.profile.role and user.profile.role.name == 'Admin':
        is_admin = True

    if is_admin:
        return set(Permission.objects.values_list('code', flat=True))

    perms = set()

    # 1. Role defaults
    if hasattr(user, 'profile') and user.profile.role:
        role_perms = RolePermission.objects.filter(role=user.profile.role).values_list('permission__code', flat=True)
        perms.update(role_perms)

    # 2. User specific ALLOW / DENY overrides
    user_perms = UserPermission.objects.filter(user=user).select_related('permission')
    for up in user_perms:
        code = up.permission.code
        if up.policy == 'ALLOW':
            perms.add(code)
        elif up.policy == 'DENY':
            perms.discard(code)

    return perms


def has_permission(user, perm_code):
    """
    Checks if a user has a specific permission code.
    """
    if not user or not user.is_authenticated or not user.is_active:
        return False

    if user.is_superuser:
        return True

    if hasattr(user, 'profile') and user.profile.role and user.profile.role.name == 'Admin':
        return True

    effective = get_user_effective_permissions(user)
    return perm_code in effective


def has_any_permission(user, perm_codes):
    """
    Checks if a user has at least one permission from a collection of codes.
    """
    if not user or not user.is_authenticated or not user.is_active:
        return False

    if user.is_superuser:
        return True

    if hasattr(user, 'profile') and user.profile.role and user.profile.role.name == 'Admin':
        return True

    effective = get_user_effective_permissions(user)
    return any(c in effective for c in perm_codes)


def validate_admin_protection(target_user, action_name="modify"):
    """
    Guarantees that there is always at least one active Admin in the system.
    Raises ValueError if the operation would leave zero active Admins.
    """
    is_target_admin = target_user.is_superuser
    if hasattr(target_user, 'profile') and target_user.profile and target_user.profile.role:
        if target_user.profile.role.name == 'Admin':
            is_target_admin = True

    if not is_target_admin:
        return True  # Non-admin users are not subject to the last-admin restriction

    # Count how many other active Admins exist
    other_active_admins = User.objects.filter(
        is_active=True
    ).filter(
        Q(is_superuser=True) | Q(profile__role__name='Admin')
    ).exclude(id=target_user.id).count()

    if other_active_admins == 0:
        raise ValueError(f"Cannot {action_name} the last active System Administrator. Farm Suit requires at least one active Admin.")

    return True


def get_user_access_summary(user):
    """
    Builds a structured dictionary of modules and permissions
    indicating whether the user has access or not.
    """
    effective = get_user_effective_permissions(user)
    all_perms = Permission.objects.all().order_by('module', 'name')

    grouped = {}
    for p in all_perms:
        if p.module not in grouped:
            grouped[p.module] = {
                "module": p.module,
                "granted": [],
                "denied": [],
                "has_full_access": True,
                "has_any_access": False
            }
        
        has_access = p.code in effective
        perm_info = {
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "granted": has_access
        }

        if has_access:
            grouped[p.module]["granted"].append(perm_info)
            grouped[p.module]["has_any_access"] = True
        else:
            grouped[p.module]["denied"].append(perm_info)
            grouped[p.module]["has_full_access"] = False

    return list(grouped.values())
