#!/bin/bash

# NovaShield 2025 Development Environment Startup Script

set -e

echo "🛡️ Starting NovaShield 2025 Development Environment"
echo "==================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Check if setup has been run
check_setup() {
    if [ ! -f ".env.development" ]; then
        print_warning "Development environment not set up yet."
        print_status "Running setup script..."
        ./scripts/development/setup.sh
    fi
}

# Start services
start_services() {
    print_status "Starting NovaShield development services..."
    
    cd docker/
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.dev.yml up -d
    else
        docker compose -f docker-compose.dev.yml up -d
    fi
    
    cd ..
    
    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Function to check if a service is healthy
    check_service() {
        local service_name=$1
        local url=$2
        local max_attempts=30
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -s "$url" > /dev/null 2>&1; then
                print_success "$service_name is ready"
                return 0
            fi
            
            attempt=$((attempt + 1))
            printf "."
            sleep 2
        done
        
        print_warning "$service_name took longer than expected to start"
        return 1
    }
    
    echo "Checking services..."
    
    # Check backend first (other services depend on it)
    print_status "Checking backend service..."
    check_service "Backend API" "http://localhost:5000/health"
    
    # Check frontend
    print_status "Checking frontend service..."
    check_service "Frontend" "http://localhost:3000"
    
    # Check monitoring services
    print_status "Checking monitoring services..."
    check_service "Grafana" "http://localhost:3001/api/health"
    check_service "Prometheus" "http://localhost:9091/-/healthy"
    
    echo
    print_success "All core services are ready!"
}

# Show service status
show_status() {
    echo
    echo "📊 Service Status:"
    echo "=================="
    
    cd docker/
    
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.dev.yml ps
    else
        docker compose -f docker-compose.dev.yml ps
    fi
    
    cd ..
}

# Show access URLs
show_urls() {
    echo
    echo "🌐 Access URLs:"
    echo "==============="
    echo "Frontend (React):     http://localhost:3000"
    echo "Backend API:          http://localhost:5000"
    echo "API Documentation:    http://localhost:5000/api"
    echo "Grafana Dashboard:    http://localhost:3001 (admin/novashield-dev-grafana-password)"
    echo "Prometheus:           http://localhost:9091"
    echo "InfluxDB:            http://localhost:8086"
    echo
    echo "🔧 Development Services:"
    echo "======================="
    echo "Security Engine:      http://localhost:8001"
    echo "AI Engine:           http://localhost:8002"
    echo "Terminal Service:     http://localhost:8080"
    echo "Monitoring Service:   http://localhost:9090"
    echo "Redis:               localhost:6379"
    echo
}

# Show useful commands
show_commands() {
    echo "📋 Useful Commands:"
    echo "=================="
    echo "View logs:           ./scripts/development/logs.sh"
    echo "Stop services:       ./scripts/development/stop-dev.sh"
    echo "Restart services:    ./scripts/development/restart-dev.sh"
    echo "Reset environment:   ./scripts/development/reset-dev.sh"
    echo
    echo "Individual service logs:"
    echo "docker logs nova-dashboard-frontend-1 -f"
    echo "docker logs nova-dashboard-backend-1 -f"
    echo "docker logs nova-dashboard-security-engine-1 -f"
    echo
}

# Main execution
main() {
    check_setup
    start_services
    wait_for_services
    show_status
    show_urls
    show_commands
    
    print_success "NovaShield development environment is running!"
    echo
    echo "🚀 Happy coding! The future of security is being built..."
}

# Run main function
main "$@"