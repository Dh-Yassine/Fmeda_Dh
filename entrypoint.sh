#!/usr/bin/env bash
set -euo pipefail

# Render ephemeral disk: collect env and prepare DB
python -c "import os; print('DJANGO_SETTINGS_MODULE=', os.getenv('DJANGO_SETTINGS_MODULE','fmeda_backend.settings'))"

python manage.py migrate --noinput

if [ -d "./data" ]; then
  if python manage.py help | grep -q import_data; then
    echo "Running initial data import from ./data"
    python manage.py import_data --data-dir ./data || true
  fi
fi

exec gunicorn fmeda_backend.wsgi --bind 0.0.0.0:${PORT:-8000} --log-file -

