from django.urls import path
from . import views

urlpatterns = [
    path('', views.purchases_view, name='purchases-list-create'),
    path('<int:pk>/', views.purchase_detail_view, name='purchases-detail-update'),
    path('<int:pk>/post/', views.post_purchase_view, name='purchases-post'),
    path('<int:pk>/reverse/', views.reverse_purchase_view, name='purchases-reverse'),
]
