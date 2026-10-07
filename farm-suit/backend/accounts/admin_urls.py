from django.urls import path
from . import admin_views

urlpatterns = [
    # Users
    path('users/', admin_views.admin_users_view, name='admin-users'),
    path('users/<int:user_id>/', admin_views.admin_user_detail_view, name='admin-user-detail'),
    path('users/<int:user_id>/disable/', admin_views.admin_user_disable_view, name='admin-user-disable'),
    path('users/<int:user_id>/enable/', admin_views.admin_user_enable_view, name='admin-user-enable'),
    path('users/<int:user_id>/reset-password/', admin_views.admin_user_reset_password_view, name='admin-user-reset-password'),

    # Roles
    path('roles/', admin_views.admin_roles_view, name='admin-roles'),
    path('roles/<int:role_id>/', admin_role_detail := admin_views.admin_role_detail_view, name='admin-role-detail'),

    # Permissions
    path('permissions/', admin_views.admin_permissions_view, name='admin-permissions'),

    # Security Settings
    path('security-settings/', admin_views.admin_security_settings_view, name='admin-security-settings'),

    # Audit Logs
    path('audit-logs/', admin_views.admin_audit_logs_view, name='admin-audit-logs'),
]
