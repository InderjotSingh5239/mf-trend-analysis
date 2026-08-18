FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ml.txt /code/
# Full image (API + Celery worker/beat share this Dockerfile in
# docker-compose.yml) installs both the core and ML training stacks
# by default, so `docker compose up` keeps working exactly as before
# the requirements.txt split. For a lean, ML-training-incapable API
# image (e.g. horizontally-scaled API replicas that never train
# models), build with `--build-arg INSTALL_ML=false`.
ARG INSTALL_ML=true
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    if [ "$INSTALL_ML" = "true" ]; then pip install --no-cache-dir -r requirements-ml.txt; fi

COPY . /code

EXPOSE 8000

ENV PORT=8000

# Shell form so $PORT is expanded at container start — Render (and similar
# PaaS providers) inject PORT dynamically; docker-compose overrides CMD
# anyway (it runs migrations first), so this only matters for `docker run`.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
