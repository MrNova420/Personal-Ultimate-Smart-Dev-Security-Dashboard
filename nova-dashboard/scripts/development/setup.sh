#!/bin/bash

# NovaShield 2025 Development Environment Setup Script
# This script sets up the development environment with Docker

set -e

echo "🛡️ NovaShield 2025 Development Environment Setup"
echo "================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p data/databases
    mkdir -p data/backups
    mkdir -p data/uploads
    mkdir -p data/cache
    mkdir -p logs/application
    mkdir -p logs/security
    mkdir -p logs/audit
    mkdir -p logs/system
    mkdir -p ssl
    
    print_success "Directories created"
}

# Set proper permissions
set_permissions() {
    print_status "Setting proper permissions..."
    
    # Set permissions for data and logs directories
    chmod 755 data/
    chmod 755 logs/
    chmod -R 644 data/
    chmod -R 644 logs/
    
    # Make scripts executable
    find scripts/ -name "*.sh" -exec chmod +x {} \;
    
    print_success "Permissions set"
}

# Build Docker images
build_images() {
    print_status "Building Docker images for development..."
    
    cd docker/
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.dev.yml build
    else
        docker compose -f docker-compose.dev.yml build
    fi
    
    cd ..
    
    print_success "Docker images built successfully"
}

# Create environment file if it doesn't exist
create_env_file() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.development" ]; then
        print_status "Creating development environment file..."
        
        cat > .env.development << EOF
# NovaShield 2025 Development Environment
NODE_ENV=development

# JWT and Session Secrets (CHANGE IN PRODUCTION)
JWT_SECRET=dev-jwt-secret-change-in-production-12345678901234567890
SESSION_SECRET=dev-session-secret-change-in-production-12345678901234567890

# Database Configuration
DATABASE_URL=file:../data/databases/novashield-dev.db
REDIS_URL=redis://redis:6379

# API Configuration
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Service URLs
SECURITY_ENGINE_URL=http://security-engine:8001
AI_ENGINE_URL=http://ai-engine:8002
TERMINAL_SERVICE_URL=http://terminal-service:8080
MONITORING_SERVICE_URL=http://monitoring-service:9090

# Logging
LOG_LEVEL=debug

# Security Settings (Development)
BCRYPT_ROUNDS=10
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Development flags
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
EOF
        
        print_success "Development environment file created"
    else
        print_status "Environment file already exists"
    fi
}

# Print next steps
print_next_steps() {
    echo
    echo "🎉 Development environment setup complete!"
    echo
    echo "Next steps:"
    echo "1. Start the development environment:"
    echo "   ./scripts/development/start-dev.sh"
    echo
    echo "2. Access the applications:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:5000"
    echo "   - Grafana: http://localhost:3001 (admin/novashield-dev-grafana-password)"
    echo "   - Prometheus: http://localhost:9091"
    echo
    echo "3. View logs:"
    echo "   ./scripts/development/logs.sh"
    echo
    echo "4. Stop the environment:"
    echo "   ./scripts/development/stop-dev.sh"
    echo
}

# Main execution
main() {
    echo "Starting NovaShield development environment setup..."
    echo
    
    check_docker
    check_docker_compose
    create_directories
    set_permissions
    create_env_file
    build_images
    
    print_success "Setup completed successfully!"
    print_next_steps
}

# Run main function
main "$@"