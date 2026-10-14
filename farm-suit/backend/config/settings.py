import os
import time
from pathlib import Path
from dotenv import load_dotenv

# Enforce Indian Standard Time (IST) at OS and process level
os.environ['TZ'] = 'Asia/Kolkata'
if hasattr(time, 'tzset'):
    time.tzset()


BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-farm-suit-default-key-mvp-2026')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = [
	host.strip()
	for host in os.getenv(
		'ALLOWED_HOSTS',
		'localhost,127.0.0.1'
	).split(',')
	if host.strip()
]

# Automatically detect local network IPs for mobile testing
import socket
def get_local_ip_origins():
    origins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            origins.append(f'http://{ip}:5173')
            origins.append(f'http://{ip}:8000')
    except Exception:
        pass
    # Automatically include hosts from ALLOWED_HOSTS
    for host in ALLOWED_HOSTS:
        if host and host != '*':
            origins.append(f'http://{host}')
            origins.append(f'https://{host}')
            origins.append(f'http://{host}:5173')
            origins.append(f'http://{host}:8000')
            origins.append(f'http://{host}:3000')
    # Explicitly include known local IP
    if 'http://192.168.29.100:5173' not in origins:
        origins.append('http://192.168.29.100:5173')
        origins.append('http://192.168.29.100:8000')

    # Allow custom CSRF origins from environment variables (.env)
    env_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', '')
    if env_csrf:
        for origin in env_csrf.split(','):
            origin = origin.strip()
            if origin:
                origins.append(origin)

    return list(set(origins))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'accounts.apps.AccountsConfig',
    'masters.apps.MastersConfig',
    'trading.apps.TradingConfig',
    'farming.apps.FarmingConfig',
    'inventory.apps.InventoryConfig',
    'sales.apps.SalesConfig',
    'orders.apps.OrdersConfig',
    'reports.apps.ReportsConfig',
    'audit.apps.AuditConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# PostgreSQL Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DATABASE_NAME', 'farm_suit_db'),
        'USER': os.getenv('DATABASE_USER', 'postgres'),
        'PASSWORD': os.getenv('DATABASE_PASSWORD', 'root'),
        'HOST': os.getenv('DATABASE_HOST', '127.0.0.1'),
        'PORT': os.getenv('DATABASE_PORT', '5432'),
        'OPTIONS': {
            'options': '-c timezone=Asia/Kolkata',
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 4},
    },
]

LANGUAGE_CODE = 'en-in'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = False

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Session and CSRF Configuration for React SPA
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True  # Development convenience for mobile devices on LAN
CORS_ALLOWED_ORIGINS = get_local_ip_origins()
CSRF_TRUSTED_ORIGINS = get_local_ip_origins()

SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False  # Allows frontend client to read the csrftoken cookie
SESSION_COOKIE_HTTPONLY = True

# Nginx Reverse Proxy Support
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Production Logging Configuration (Captures 500 errors and tracebacks in Gunicorn/PM2 logs)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

