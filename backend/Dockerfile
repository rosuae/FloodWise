# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalam dependintele de sistem necesare pentru bibliotecile GIS si meteo
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    libproj-dev \
    libeccodes-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalam dependintele separat pentru cache
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copiem restul aplicatiei
COPY . .

EXPOSE 8000

CMD ["/app/start.sh"]
