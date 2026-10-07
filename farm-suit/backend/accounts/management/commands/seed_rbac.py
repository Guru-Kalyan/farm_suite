from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Role, Permission, RolePermission, UserProfile, SecuritySettings


PERMISSIONS_DATA = [
    # Dashboard
    {"code": "dashboard.view", "name": "View Dashboard", "module": "Dashboard", "description": "Can access main dashboard KPIs and overview"},

    # Users
    {"code": "users.view", "name": "View Users", "module": "Users", "description": "Can view users list and details"},
    {"code": "users.create", "name": "Create Users", "module": "Users", "description": "Can create new user accounts"},
    {"code": "users.edit", "name": "Edit Users", "module": "Users", "description": "Can edit existing user accounts"},
    {"code": "users.delete", "name": "Delete Users", "module": "Users", "description": "Can delete user accounts"},
    {"code": "users.enable", "name": "Enable Users", "module": "Users", "description": "Can enable user accounts"},
    {"code": "users.disable", "name": "Disable Users", "module": "Users", "description": "Can disable user accounts"},
    {"code": "users.reset_password", "name": "Reset Passwords", "module": "Users", "description": "Can reset user passwords"},

    # Roles
    {"code": "roles.view", "name": "View Roles", "module": "Roles", "description": "Can view system and custom roles"},
    {"code": "roles.create", "name": "Create Roles", "module": "Roles", "description": "Can create new custom roles"},
    {"code": "roles.edit", "name": "Edit Roles", "module": "Roles", "description": "Can edit roles and role permissions"},
    {"code": "roles.delete", "name": "Delete Roles", "module": "Roles", "description": "Can delete custom roles"},

    # Permissions
    {"code": "permissions.view", "name": "View Permissions", "module": "Permissions", "description": "Can view all system permissions catalog"},
    {"code": "permissions.assign", "name": "Assign Permissions", "module": "Permissions", "description": "Can assign permissions to users or roles"},

    # Farms
    {"code": "farms.view", "name": "View Farms", "module": "Farms", "description": "Can view farm plots and locations"},
    {"code": "farms.create", "name": "Create Farms", "module": "Farms", "description": "Can create farm plots"},
    {"code": "farms.edit", "name": "Edit Farms", "module": "Farms", "description": "Can edit farm plots"},
    {"code": "farms.delete", "name": "Delete Farms", "module": "Farms", "description": "Can delete farm plots"},

    # Crops & Farming
    {"code": "crops.view", "name": "View Crops", "module": "Crops", "description": "Can view crop cycles and harvest records"},
    {"code": "crops.create", "name": "Create Crops", "module": "Crops", "description": "Can create cultivation batches and harvests"},
    {"code": "crops.edit", "name": "Edit Crops", "module": "Crops", "description": "Can edit cultivation batches and harvests"},
    {"code": "crops.delete", "name": "Delete Crops", "module": "Crops", "description": "Can delete cultivation batches and harvests"},

    # Inventory
    {"code": "inventory.view", "name": "View Inventory", "module": "Inventory", "description": "Can view stock overview and inventory lots"},
    {"code": "inventory.create", "name": "Create Stock", "module": "Inventory", "description": "Can add or receive inventory stock"},
    {"code": "inventory.edit", "name": "Edit Stock", "module": "Inventory", "description": "Can edit inventory details"},
    {"code": "inventory.delete", "name": "Delete Stock", "module": "Inventory", "description": "Can remove stock lots"},
    {"code": "inventory.stock_adjustment", "name": "Stock Adjustment", "module": "Inventory", "description": "Can perform manual stock ledger adjustments"},

    # Sales
    {"code": "sales.view", "name": "View Sales", "module": "Sales", "description": "Can view sales bills and transactions"},
    {"code": "sales.create", "name": "Create Sales", "module": "Sales", "description": "Can create new sales bills"},
    {"code": "sales.edit", "name": "Edit Sales", "module": "Sales", "description": "Can edit sales bills"},
    {"code": "sales.delete", "name": "Delete Sales", "module": "Sales", "description": "Can cancel or delete sales bills"},

    # Purchases
    {"code": "purchases.view", "name": "View Purchases", "module": "Purchases", "description": "Can view purchase bills and procurement"},
    {"code": "purchases.create", "name": "Create Purchases", "module": "Purchases", "description": "Can record purchase bills"},
    {"code": "purchases.edit", "name": "Edit Purchases", "module": "Purchases", "description": "Can edit purchase bills"},
    {"code": "purchases.delete", "name": "Delete Purchases", "module": "Purchases", "description": "Can delete purchase bills"},

    # Customers
    {"code": "customers.view", "name": "View Customers", "module": "Customers", "description": "Can view customer master records"},
    {"code": "customers.create", "name": "Create Customers", "module": "Customers", "description": "Can create customer master records"},
    {"code": "customers.edit", "name": "Edit Customers", "module": "Customers", "description": "Can edit customer master records"},
    {"code": "customers.delete", "name": "Delete Customers", "module": "Customers", "description": "Can delete customer master records"},

    # Vendors
    {"code": "vendors.view", "name": "View Vendors", "module": "Vendors", "description": "Can view vendor master records"},
    {"code": "vendors.create", "name": "Create Vendors", "module": "Vendors", "description": "Can create vendor master records"},
    {"code": "vendors.edit", "name": "Edit Vendors", "module": "Vendors", "description": "Can edit vendor master records"},
    {"code": "vendors.delete", "name": "Delete Vendors", "module": "Vendors", "description": "Can delete vendor master records"},

    # Billing
    {"code": "invoices.view", "name": "View Invoices", "module": "Billing", "description": "Can view billing invoices"},
    {"code": "invoices.create", "name": "Create Invoices", "module": "Billing", "description": "Can generate invoices"},
    {"code": "invoices.edit", "name": "Edit Invoices", "module": "Billing", "description": "Can modify invoices"},
    {"code": "invoices.delete", "name": "Delete Invoices", "module": "Billing", "description": "Can delete invoices"},
    {"code": "invoices.download", "name": "Download Invoices", "module": "Billing", "description": "Can download generated PDF invoices"},

    # Finance
    {"code": "expenses.view", "name": "View Expenses", "module": "Finance", "description": "Can view financial expenses"},
    {"code": "expenses.create", "name": "Create Expenses", "module": "Finance", "description": "Can record expenses"},
    {"code": "expenses.edit", "name": "Edit Expenses", "module": "Finance", "description": "Can edit expenses"},
    {"code": "expenses.delete", "name": "Delete Expenses", "module": "Finance", "description": "Can delete expenses"},
    {"code": "payments.view", "name": "View Payments", "module": "Finance", "description": "Can view payments and transactions"},
    {"code": "payments.create", "name": "Record Payments", "module": "Finance", "description": "Can record payments"},
    {"code": "ledger.view", "name": "View Ledgers", "module": "Finance", "description": "Can view accounts, customer and vendor ledgers"},

    # Reports
    {"code": "reports.view", "name": "View Reports", "module": "Reports", "description": "Can access business and financial reports"},
    {"code": "reports.export", "name": "Export Reports", "module": "Reports", "description": "Can export reports to Excel/PDF"},

    # Settings
    {"code": "settings.view", "name": "View Settings", "module": "Settings", "description": "Can view system and security settings"},
    {"code": "settings.edit", "name": "Edit Settings", "module": "Settings", "description": "Can modify system and security settings"},

    # Audit (Admin Only)
    {"code": "audit_logs.view", "name": "View Audit Logs", "module": "Audit", "description": "Can view audit trail logs and entity change history (Admin Only)"},
]

ROLES_DATA = {
    "Admin": {
        "description": "Full administrative access to the entire Farm Suit system",
        "is_system": True,
        "permissions": "ALL"
    },
    "Farm Manager": {
        "description": "Responsible for farms, fields, crops, cultivation cycles, harvests, farm expenses and farm reports",
        "is_system": False,
        "permissions": [
            "dashboard.view",
            "farms.view", "farms.create", "farms.edit", "farms.delete",
            "crops.view", "crops.create", "crops.edit", "crops.delete",
            "expenses.view", "expenses.create",
            "reports.view", "reports.export"
        ]
    },
    "Accountant": {
        "description": "Responsible for sales, purchases, invoices, payments, expenses, ledgers and financial reports",
        "is_system": False,
        "permissions": [
            "dashboard.view",
            "sales.view", "sales.create", "sales.edit",
            "purchases.view", "purchases.create", "purchases.edit",
            "invoices.view", "invoices.create", "invoices.edit", "invoices.download",
            "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
            "payments.view", "payments.create",
            "ledger.view",
            "customers.view", "vendors.view",
            "reports.view", "reports.export"
        ]
    },
    "Sales Staff": {
        "description": "Responsible for customers, sales orders, invoices, and payments",
        "is_system": False,
        "permissions": [
            "dashboard.view",
            "customers.view", "customers.create", "customers.edit",
            "sales.view", "sales.create", "sales.edit",
            "invoices.view", "invoices.create", "invoices.download",
            "payments.view", "payments.create"
        ]
    },
    "Inventory Staff": {
        "description": "Responsible for inventory, stock, stock movements, purchases, and vendors",
        "is_system": False,
        "permissions": [
            "dashboard.view",
            "inventory.view", "inventory.create", "inventory.edit", "inventory.delete", "inventory.stock_adjustment",
            "purchases.view", "purchases.create",
            "vendors.view"
        ]
    },
    "Farm Worker": {
        "description": "Assigned access to farm activities, crop activities, and harvest tasks",
        "is_system": False,
        "permissions": [
            "dashboard.view",
            "farms.view",
            "crops.view", "crops.create"
        ]
    }
}


def seed_all():
    print("Seeding permissions...")
    perm_objs = {}
    for pdata in PERMISSIONS_DATA:
        perm, _ = Permission.objects.update_or_create(
            code=pdata["code"],
            defaults={
                "name": pdata["name"],
                "module": pdata["module"],
                "description": pdata["description"]
            }
        )
        perm_objs[perm.code] = perm

    print(f"Total permissions registered: {len(perm_objs)}")

    print("Seeding roles and default role permissions...")
    for role_name, rdata in ROLES_DATA.items():
        role, _ = Role.objects.update_or_create(
            name=role_name,
            defaults={
                "description": rdata["description"],
                "is_system": rdata["is_system"]
            }
        )

        RolePermission.objects.filter(role=role).delete()
        if rdata["permissions"] == "ALL":
            for perm in perm_objs.values():
                RolePermission.objects.create(role=role, permission=perm)
        else:
            for pcode in rdata["permissions"]:
                if pcode in perm_objs:
                    RolePermission.objects.create(role=role, permission=perm_objs[pcode])

    print("Configuring default security settings...")
    SecuritySettings.get_settings()

    print("Linking existing admin user to Admin role...")
    admin_user = User.objects.filter(username="admin").first()
    if admin_user:
        admin_role = Role.objects.get(name="Admin")
        profile, created = UserProfile.objects.get_or_create(
            user=admin_user,
            defaults={
                "role": admin_role,
                "employee_id": "EMP-001",
                "phone": "+91 99999 99999"
            }
        )
        if not created and not profile.role:
            profile.role = admin_role
            profile.save()

    print("RBAC seeding complete!")


class Command(BaseCommand):
    help = "Seeds initial RBAC permissions, roles, and default configuration"

    def handle(self, *args, **options):
        seed_all()
        self.stdout.write(self.style.SUCCESS("Successfully seeded Farm Suit RBAC!"))
