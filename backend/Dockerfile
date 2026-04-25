FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalam dependintele separat pentru cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiem restul aplicatiei
COPY . .

RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
