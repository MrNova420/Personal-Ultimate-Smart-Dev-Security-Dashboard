# NovaShield 2025 Security Engine Dockerfile
# Python-based security services with hardening

FROM python:3.13-alpine AS base

# Security: Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    rust \
    cargo \
    ca-certificates \
    dumb-init && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S python && \
    adduser -S pyuser -u 1001 -G python

# Set working directory
WORKDIR /app

# Set environment variables for security
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Copy requirements first for better caching
COPY requirements*.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY --chown=pyuser:python src/ ./src/
COPY --chown=pyuser:python data/ ./data/

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R pyuser:python /app

# Security: Switch to non-root user
USER pyuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]

# Development stage
FROM base AS development

# Switch back to root to install dev dependencies
USER root

# Install development dependencies
RUN pip install --no-cache-dir -r requirements-dev.txt

# Switch back to non-root user
USER pyuser

# Start development server with auto-reload
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]