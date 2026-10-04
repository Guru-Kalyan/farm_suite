from django.urls import path
from . import views

urlpatterns = [
    # Cultivation
    path('cultivation/', views.cultivation_batches_view, name='farming-cultivation-list-create'),
    path('cultivation/<int:pk>/', views.cultivation_batch_detail_view, name='farming-cultivation-detail-update'),

    # Harvest
    path('harvest/', views.harvests_view, name='farming-harvest-list-create'),
    path('harvest/<int:pk>/', views.harvest_detail_view, name='farming-harvest-detail'),
    path('harvest/<int:pk>/post/', views.post_harvest_view, name='farming-harvest-post'),
]
