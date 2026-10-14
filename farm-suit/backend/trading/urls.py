from django.urls import path
from . import views

urlpatterns = [
    path('', views.purchases_view, name='purchases-list-create'),
    path('vendor-payments/', views.all_vendor_payments_view, name='purchases-vendor-payments-all'),
    path('trade-dashboard/', views.trade_dashboard_view, name='trading-dashboard'),
    path('<int:pk>/', views.purchase_detail_view, name='purchases-detail-update'),
    path('<int:pk>/post/', views.post_purchase_view, name='purchases-post'),
    path('<int:pk>/reverse/', views.reverse_purchase_view, name='purchases-reverse'),
    path('<int:pk>/pdf/', views.download_purchase_pdf_view, name='purchases-pdf-download'),
    path('<int:pk>/payments/', views.purchase_payments_view, name='purchases-bill-payments'),
]
