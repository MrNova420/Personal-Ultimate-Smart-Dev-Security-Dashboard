# NovaShield 2025 Monitoring Service Dockerfile
# Go-based monitoring service with security hardening

# Build stage
FROM golang:1.20-alpine AS builder

# Security: Install required packages and updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    git \
    ca-certificates \
    tzdata && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && \
    go mod verify

# Copy source code
COPY src/ ./src/

# Build the application with security flags
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o monitoring-service ./src/main.go

# Production stage
FROM scratch AS production

# Copy timezone data and CA certificates
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy built binary
COPY --from=builder /app/monitoring-service /monitoring-service

# Expose port
EXPOSE 9090

# Health check (using wget from alpine base)
# Note: scratch doesn't have health check capabilities, so we'll use multi-stage

# Start the application
ENTRYPOINT ["/monitoring-service"]

# Alternative production stage with minimal alpine base for health checks
FROM alpine:3.18 AS production-with-healthcheck

# Security: Install security updates and minimal packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    dumb-init \
    wget && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S golang && \
    adduser -S gouser -u 1001 -G golang

# Copy built binary
COPY --from=builder --chown=gouser:golang /app/monitoring-service /app/monitoring-service

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R gouser:golang /app

# Security: Switch to non-root user
USER gouser

# Set working directory
WORKDIR /app

# Expose port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9090/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["./monitoring-service"]

# Development stage
FROM golang:1.20-alpine AS development

# Security: Install required packages and updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    git \
    ca-certificates \
    dumb-init && \
    rm -rf /var/cache/apk/*

# Install air for hot reloading
RUN go install github.com/cosmtrek/air@latest

# Security: Create non-root user
RUN addgroup -g 1001 -S golang && \
    adduser -S gouser -u 1001 -G golang

# Set working directory
WORKDIR /app

# Copy source code
COPY --chown=gouser:golang . .

# Download dependencies
RUN go mod download

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R gouser:golang /app

# Security: Switch to non-root user
USER gouser

# Expose port
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9090/health || exit 1

# Start development server with hot reload
ENTRYPOINT ["dumb-init", "--"]
CMD ["air", "-c", ".air.toml"]