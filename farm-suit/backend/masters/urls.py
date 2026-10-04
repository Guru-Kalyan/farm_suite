from django.urls import path
from . import views

urlpatterns = [
    # Categories
    path('categories/', views.categories_view, name='masters-categories'),
    path('categories/<int:pk>/', views.category_detail_view, name='masters-category-detail'),
    
    # Units of Measure
    path('units/', views.units_view, name='masters-units'),
    
    # Items
    path('items/', views.items_view, name='masters-items'),
    path('items/<int:pk>/', views.item_detail_view, name='masters-item-detail'),
    
    # Vendors
    path('vendors/', views.vendors_view, name='masters-vendors'),
    path('vendors/<int:pk>/', views.vendor_detail_view, name='masters-vendor-detail'),
    
    # Customers
    path('customers/', views.customers_view, name='masters-customers'),
    path('customers/<int:pk>/', views.customer_detail_view, name='masters-customer-detail'),
    
    # Farm Plots
    path('farm-plots/', views.farm_plots_view, name='masters-farm-plots'),
    path('farm-plots/<int:pk>/', views.farm_plot_detail_view, name='masters-farm-plot-detail'),
]
