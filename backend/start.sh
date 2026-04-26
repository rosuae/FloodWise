#!/bin/bash
set -e

# Asteptam baza de date daca e necesar (optional, depinde de docker-compose)
# echo "Waiting for database..."
# sleep 5

# Rulam migrarile
echo "Running database migrations..."
alembic upgrade head

# Pornim aplicatia
echo "Starting FastAPI application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
