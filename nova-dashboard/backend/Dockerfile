# NovaShield 2025 Backend Dockerfile
# Multi-stage build with security hardening

# Build stage
FROM node:18-alpine AS builder

# Security: Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init ca-certificates && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Security: Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init ca-certificates && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R nodeuser:nodejs /app

# Security: Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Development stage
FROM node:18-alpine AS development

# Security: Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init ca-certificates && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodeuser:nodejs package*.json ./
COPY --chown=nodeuser:nodejs tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY --chown=nodeuser:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs /app/data && \
    chown -R nodeuser:nodejs /app

# Security: Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start development server
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]