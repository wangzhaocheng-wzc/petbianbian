#!/bin/bash

# Pet Health Platform Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"

echo -e "${GREEN}🚀 Starting deployment for ${ENVIRONMENT} environment${NC}"

# Function to check if required tools are installed
check_requirements() {
    echo -e "${YELLOW}📋 Checking requirements...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements satisfied${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "${YELLOW}🔧 Setting up environment...${NC}"
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env file with your configuration${NC}"
    fi
    
    # Create necessary directories
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p docker/ssl
    
    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

# Function to build images
build_images() {
    echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
    
    case $ENVIRONMENT in
        "development")
            COMPOSE_FILE="docker-compose.dev.yml"
            ;;
        "production")
            COMPOSE_FILE="docker-compose.yml -f docker-compose.prod.yml"
            ;;
        *)
            COMPOSE_FILE="docker-compose.yml"
            ;;
    esac
    
    docker-compose -f $COMPOSE_FILE build --no-cache
    echo -e "${GREEN}✅ Images built successfully${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    
    docker-compose -f $COMPOSE_FILE up -d
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 30
    
    # Health check
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Services are running and healthy${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        docker-compose -f $COMPOSE_FILE logs
        exit 1
    fi
}

# Function to run database migrations
run_migrations() {
    echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
    
    # Wait for MongoDB to be ready
    docker-compose -f $COMPOSE_FILE exec -T mongo mongosh --eval "db.adminCommand('ping')" > /dev/null
    
    echo -e "${GREEN}✅ Database is ready${NC}"
}

# Function to show deployment info
show_info() {
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}📊 Service Information:${NC}"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:5000/api"
    echo "MongoDB: localhost:27017"
    echo "Redis: localhost:6379"
    echo ""
    echo -e "${YELLOW}📝 Useful commands:${NC}"
    echo "View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "Restart services: docker-compose -f $COMPOSE_FILE restart"
}

# Main deployment flow
main() {
    echo -e "${GREEN}🐾 Pet Health Platform Deployment${NC}"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    check_requirements
    setup_environment
    build_images
    start_services
    run_migrations
    show_info
}

# Handle script arguments
case $1 in
    "development"|"dev")
        main
        ;;
    "production"|"prod")
        main
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
    "clean")
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    *)
        echo "Usage: $0 {development|production|stop|clean|logs}"
        echo ""
        echo "Commands:"
        echo "  development  - Deploy in development mode"
        echo "  production   - Deploy in production mode"
        echo "  stop         - Stop all services"
        echo "  clean        - Stop services and clean up"
        echo "  logs         - Show service logs"
        exit 1
        ;;
esac