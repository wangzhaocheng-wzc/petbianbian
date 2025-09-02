#!/bin/bash

# Health Check Script for Pet Health Platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000/api"
MONGO_HOST="localhost:27017"
REDIS_HOST="localhost:6379"

echo -e "${GREEN}🏥 Pet Health Platform Health Check${NC}"
echo "=================================="

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local service=$2
    
    echo -n "Checking $service... "
    
    if curl -f -s "$url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check MongoDB
check_mongo() {
    echo -n "Checking MongoDB... "
    
    if docker exec pet-health-mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    echo -n "Checking Redis... "
    
    if docker exec pet-health-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check Docker containers
check_containers() {
    echo -e "${YELLOW}📦 Container Status:${NC}"
    
    containers=("pet-health-frontend" "pet-health-backend" "pet-health-mongo" "pet-health-redis" "pet-health-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
                echo -e "$container: ${GREEN}✅ Running${NC}"
            else
                echo -e "$container: ${YELLOW}⚠️  Running but unhealthy${NC}"
            fi
        else
            echo -e "$container: ${RED}❌ Not running${NC}"
        fi
    done
}

# Function to show resource usage
show_resources() {
    echo -e "${YELLOW}📊 Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -6
}

# Function to show logs summary
show_logs_summary() {
    echo -e "${YELLOW}📝 Recent Logs Summary:${NC}"
    
    echo "Backend errors (last 10):"
    docker logs pet-health-backend 2>&1 | grep -i error | tail -10 || echo "No recent errors"
    
    echo ""
    echo "Frontend errors (last 10):"
    docker logs pet-health-frontend 2>&1 | grep -i error | tail -10 || echo "No recent errors"
}

# Main health check
main() {
    local exit_code=0
    
    # Check containers
    check_containers
    echo ""
    
    # Check services
    echo -e "${YELLOW}🔍 Service Health Checks:${NC}"
    
    check_http "$BACKEND_URL" "Backend API" || exit_code=1
    check_http "$FRONTEND_URL" "Frontend" || exit_code=1
    check_mongo || exit_code=1
    check_redis || exit_code=1
    
    echo ""
    
    # Show additional info if requested
    if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
        show_resources
        echo ""
        show_logs_summary
    fi
    
    # Summary
    echo "=================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All services are healthy!${NC}"
    else
        echo -e "${RED}⚠️  Some services are unhealthy${NC}"
    fi
    
    exit $exit_code
}

# Handle arguments
case $1 in
    "--help"|"-h")
        echo "Usage: $0 [--detailed|-d] [--help|-h]"
        echo ""
        echo "Options:"
        echo "  --detailed, -d    Show detailed resource usage and logs"
        echo "  --help, -h        Show this help message"
        ;;
    *)
        main "$@"
        ;;
esac