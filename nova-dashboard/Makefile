# NovaShield 2025 Enterprise Security Platform
# Development and Build Automation

.PHONY: help setup dev build test clean logs stop restart reset

# Default target
help:
	@echo "🛡️ NovaShield 2025 Development Commands"
	@echo "========================================"
	@echo ""
	@echo "Development:"
	@echo "  setup     - Set up development environment"
	@echo "  dev       - Start development environment"
	@echo "  stop      - Stop all services"
	@echo "  restart   - Restart development environment"
	@echo "  reset     - Reset and clean development environment"
	@echo ""
	@echo "Monitoring:"
	@echo "  logs      - View aggregated logs"
	@echo "  status    - Show service status"
	@echo ""
	@echo "Build & Test:"
	@echo "  build     - Build all Docker images"
	@echo "  test      - Run all tests"
	@echo "  lint      - Run linting across all services"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean     - Clean up Docker resources"
	@echo "  backup    - Backup development data"
	@echo ""

# Development Environment
setup:
	@echo "🔧 Setting up NovaShield development environment..."
	@./scripts/development/setup.sh

dev:
	@echo "🚀 Starting NovaShield development environment..."
	@./scripts/development/start-dev.sh

stop:
	@echo "🛑 Stopping NovaShield services..."
	@cd docker && docker-compose -f docker-compose.dev.yml down

restart:
	@echo "🔄 Restarting NovaShield development environment..."
	@make stop
	@make dev

reset:
	@echo "🧹 Resetting NovaShield development environment..."
	@cd docker && docker-compose -f docker-compose.dev.yml down -v
	@docker system prune -f
	@make setup

# Monitoring
logs:
	@echo "📋 Showing NovaShield service logs..."
	@cd docker && docker-compose -f docker-compose.dev.yml logs -f

status:
	@echo "📊 NovaShield service status:"
	@cd docker && docker-compose -f docker-compose.dev.yml ps

# Build & Test
build:
	@echo "🏗️ Building NovaShield Docker images..."
	@cd docker && docker-compose -f docker-compose.dev.yml build

test:
	@echo "🧪 Running NovaShield tests..."
	@echo "Frontend tests:"
	@cd frontend && npm test -- --coverage --watchAll=false
	@echo "Backend tests:"
	@cd backend && npm test -- --coverage

lint:
	@echo "🔍 Running NovaShield linting..."
	@echo "Frontend linting:"
	@cd frontend && npm run lint
	@echo "Backend linting:"
	@cd backend && npm run lint

# Maintenance
clean:
	@echo "🧹 Cleaning up Docker resources..."
	@docker system prune -f
	@docker volume prune -f
	@docker image prune -f

backup:
	@echo "💾 Backing up NovaShield development data..."
	@mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	@cp -r data/ backups/$(shell date +%Y%m%d_%H%M%S)/
	@echo "Backup created in backups/$(shell date +%Y%m%d_%H%M%S)/"

# Individual service commands
frontend-dev:
	@echo "🎨 Starting frontend development server..."
	@cd frontend && npm start

backend-dev:
	@echo "⚙️ Starting backend development server..."
	@cd backend && npm run dev

security-dev:
	@echo "🛡️ Starting security engine development server..."
	@cd security-engine && python -m uvicorn src.main:app --reload --port 8001

# Database commands
db-migrate:
	@echo "📊 Running database migrations..."
	@cd backend && npm run migrate

db-seed:
	@echo "🌱 Seeding database with test data..."
	@cd backend && npm run seed

# Docker specific commands
docker-build-frontend:
	@cd frontend && docker build -t novashield-frontend .

docker-build-backend:
	@cd backend && docker build -t novashield-backend .

docker-build-security:
	@cd security-engine && docker build -t novashield-security .

# Health checks
health:
	@echo "🔍 Checking NovaShield service health..."
	@curl -s http://localhost:5000/health || echo "Backend: DOWN"
	@curl -s http://localhost:3000 > /dev/null && echo "Frontend: UP" || echo "Frontend: DOWN"
	@curl -s http://localhost:3001/api/health > /dev/null && echo "Grafana: UP" || echo "Grafana: DOWN"

# Quick start for new developers
quickstart: setup dev
	@echo "🎉 NovaShield development environment is ready!"
	@echo "Visit http://localhost:3000 to access the application"