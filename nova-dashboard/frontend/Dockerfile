# NovaShield 2025 Frontend Dockerfile
# Multi-stage build for security and optimization

# Build stage
FROM node:18-alpine AS builder

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

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
COPY public/ ./public/

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.29-alpine AS production

# Security: Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-custom && \
    adduser -S nginx-custom -u 1001 -G nginx-custom

# Copy built application
COPY --from=builder --chown=nginx-custom:nginx-custom /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Security: Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Security: Set proper permissions
RUN chown -R nginx-custom:nginx-custom /usr/share/nginx/html && \
    chown -R nginx-custom:nginx-custom /var/cache/nginx && \
    chown -R nginx-custom:nginx-custom /var/run && \
    chown -R nginx-custom:nginx-custom /var/log/nginx

# Security: Run as non-root user
USER nginx-custom

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Development stage
FROM node:18-alpine AS development

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY --chown=nextjs:nodejs . .

# Change to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start development server
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]