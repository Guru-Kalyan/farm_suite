from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Permission(models.Model):
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    module = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['module', 'code']

    def __str__(self):
        return f"{self.module} - {self.name} ({self.code})"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role.name} -> {self.permission.code}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    force_password_change = models.BooleanField(default=False)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def __str__(self):
        role_name = self.role.name if self.role else "No Role"
        return f"{self.user.username} ({role_name})"


class UserPermission(models.Model):
    POLICY_CHOICES = [
        ('ALLOW', 'Allow'),
        ('DENY', 'Deny'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='custom_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='user_permissions')
    policy = models.CharField(max_length=10, choices=POLICY_CHOICES, default='ALLOW')

    class Meta:
        unique_together = ('user', 'permission')

    def __str__(self):
        return f"{self.user.username} -> {self.permission.code} [{self.policy}]"


class SecuritySettings(models.Model):
    # Password Policy
    min_password_length = models.IntegerField(default=6)
    require_uppercase = models.BooleanField(default=False)
    require_lowercase = models.BooleanField(default=False)
    require_number = models.BooleanField(default=False)
    require_special_char = models.BooleanField(default=False)

    # Login Security
    max_login_attempts = models.IntegerField(default=5)
    lockout_duration_minutes = models.IntegerField(default=15)
    session_timeout_minutes = models.IntegerField(default=1440)  # 24 hours
    force_logout_inactivity = models.BooleanField(default=False)

    # Sessions
    allow_multiple_sessions = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    @classmethod
    def get_settings(cls):
        obj = cls.objects.first()
        if not obj:
            obj = cls.objects.create()
        return obj

    def __str__(self):
        return "Farm Suit Security Settings"
