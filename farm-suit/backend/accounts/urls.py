from django.urls import path
from . import views
from . import ledger_views

urlpatterns = [
    path('csrf/', views.csrf_view, name='accounts-csrf'),
    path('login/', views.login_view, name='accounts-login'),
    path('logout/', views.logout_view, name='accounts-logout'),
    path('me/', views.me_view, name='accounts-me'),
    path('change-password/', views.change_password_view, name='accounts-change-password'),
    path('forgot-password/', views.forgot_password_view, name='accounts-forgot-password'),

    # Wallets & Account Ledgers
    path('ledgers/customers/', ledger_views.customer_ledgers_list_view, name='ledger-customers-list'),
    path('ledgers/customers/<int:customer_id>/', ledger_views.customer_statement_view, name='ledger-customer-statement'),
    path('ledgers/vendors/', ledger_views.vendor_ledgers_list_view, name='ledger-vendors-list'),
    path('ledgers/vendors/<int:vendor_id>/', ledger_views.vendor_statement_view, name='ledger-vendor-statement'),
    path('ledgers/receivables/', ledger_views.receivables_prioritization_view, name='ledger-receivables'),
    path('ledgers/payables/', ledger_views.payables_prioritization_view, name='ledger-payables'),
]
