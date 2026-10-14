from django.urls import path
from . import views

urlpatterns = [
    path('', views.orders_view, name='orders-list-create'),
    path('calendar/', views.orders_calendar_view, name='orders-calendar'),
    path('<int:pk>/', views.order_detail_view, name='orders-detail'),
    path('<int:pk>/status/', views.order_status_view, name='orders-status'),
    path('<int:pk>/advances/', views.order_advances_view, name='orders-advances'),
    path('<int:pk>/fulfill/', views.order_fulfill_view, name='orders-fulfill'),
]
