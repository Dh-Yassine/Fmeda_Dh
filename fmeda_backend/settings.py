from pathlib import Path
import os
import secrets
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-1234567890abcdefghijklmnopqrstuvwxyz!@#$%^&*(-_=+)'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'fmeda',  # your app
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',  # ✅ Required
    'corsheaders.middleware.CorsMiddleware',                 # CORS (after sessions)
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # ✅ Required
    'django.contrib.messages.middleware.MessageMiddleware',     # ✅ Required
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
_cors = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
_cors = [o.strip() for o in _cors if o.strip()]
if _cors:
    CORS_ALLOWED_ORIGINS = _cors
else:
    CORS_ALLOW_ALL_ORIGINS = True


DEBUG = os.getenv("DEBUG", "true").lower() == "true"
_allowed = os.getenv("ALLOWED_HOSTS", "*").split(",")
ALLOWED_HOSTS = [h.strip() for h in _allowed if h.strip()]

# For local dev over LAN with session auth, optionally trust frontends
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]

DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
        conn_max_age=600,
    )
}

ROOT_URLCONF = 'fmeda_backend.urls' 

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

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField' 

STATIC_URL = '/static/' 