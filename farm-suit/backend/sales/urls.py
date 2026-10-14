from django.urls import path
from . import views

urlpatterns = [
    path('', views.sales_view, name='sales-list-create'),
    path('payments/', views.all_sales_payments_view, name='sales-payments-all'),
    path('<int:pk>/', views.sales_detail_view, name='sales-detail-update'),
    path('<int:pk>/post/', views.post_sales_view, name='sales-post'),
    path('<int:pk>/reverse/', views.reverse_sales_view, name='sales-reverse'),
    path('<int:pk>/pdf/', views.download_sales_pdf_view, name='sales-pdf-download'),
    path('<int:pk>/payments/', views.sales_payments_view, name='sales-bill-payments'),
]
