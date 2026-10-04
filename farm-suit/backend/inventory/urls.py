from django.urls import path
from . import views

urlpatterns = [
    path('', views.stock_overview_view, name='inventory-overview'),
    path('lots/', views.stock_lots_view, name='inventory-lots'),
    path('lots/<int:pk>/', views.lot_detail_view, name='inventory-lot-detail'),
    path('movements/', views.stock_movements_view, name='inventory-movements'),
]
