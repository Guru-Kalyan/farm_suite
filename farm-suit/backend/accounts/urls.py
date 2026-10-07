from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf_view, name='accounts-csrf'),
    path('login/', views.login_view, name='accounts-login'),
    path('logout/', views.logout_view, name='accounts-logout'),
    path('me/', views.me_view, name='accounts-me'),
    path('change-password/', views.change_password_view, name='accounts-change-password'),
    path('forgot-password/', views.forgot_password_view, name='accounts-forgot-password'),
]
