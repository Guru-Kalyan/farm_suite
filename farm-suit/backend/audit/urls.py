from django.urls import path
from . import views

urlpatterns = [
    path('', views.audit_list_view, name='audit-list'),
    path('<str:model>/<str:object_id>/', views.entity_audit_timeline_view, name='audit-entity-timeline'),
    path('timeline/<str:model>/<str:object_id>/', views.entity_audit_timeline_view, name='audit-timeline-alias'),
]
