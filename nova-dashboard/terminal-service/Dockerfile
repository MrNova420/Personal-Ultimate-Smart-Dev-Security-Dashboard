# NovaShield 2025 Terminal Service Dockerfile
# Rust-based terminal service with security hardening

# Build stage
FROM rust:1.70-alpine AS builder

# Security: Install required packages and updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy Cargo files first for better caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy main.rs to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (cached layer)
RUN cargo build --release && \
    rm -rf src target/release/deps/terminal*

# Copy source code
COPY src/ ./src/

# Build the application
RUN cargo build --release

# Production stage
FROM alpine:3.18 AS production

# Security: Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    dumb-init \
    su-exec && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S rust && \
    adduser -S rustuser -u 1001 -G rust

# Set working directory
WORKDIR /app

# Copy built binary
COPY --from=builder --chown=rustuser:rust /app/target/release/terminal-service ./terminal-service

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R rustuser:rust /app

# Security: Switch to non-root user
USER rustuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["./terminal-service"]

# Development stage
FROM rust:1.70-alpine AS development

# Security: Install required packages and updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    ca-certificates \
    dumb-init && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S rust && \
    adduser -S rustuser -u 1001 -G rust

# Install cargo-watch for development
RUN cargo install cargo-watch

# Set working directory
WORKDIR /app

# Copy source code
COPY --chown=rustuser:rust . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R rustuser:rust /app

# Security: Switch to non-root user
USER rustuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start development server with auto-reload
ENTRYPOINT ["dumb-init", "--"]
CMD ["cargo", "watch", "-x", "run"]