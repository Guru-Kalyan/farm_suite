from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_view, name='reports-dashboard'),
    path('profit/', views.profit_report_view, name='reports-profit'),
    path('sales/', views.sales_report_view, name='reports-sales'),
    path('purchases/', views.purchase_report_view, name='reports-purchases'),
    path('inventory/', views.inventory_report_view, name='reports-inventory'),
]
