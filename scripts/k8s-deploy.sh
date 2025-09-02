#!/bin/bash

# Kubernetes Deployment Script for Pet Health Platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NAMESPACE="pet-health"
KUBECTL_CMD="kubectl"

echo -e "${GREEN}🚀 Pet Health Platform Kubernetes Deployment${NC}"
echo "=============================================="

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ kubectl is available and connected to cluster${NC}"
}

# Function to create namespace
create_namespace() {
    echo -e "${YELLOW}📦 Creating namespace...${NC}"
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        echo -e "${YELLOW}⚠️  Namespace $NAMESPACE already exists${NC}"
    else
        kubectl apply -f k8s/namespace.yaml
        echo -e "${GREEN}✅ Namespace created${NC}"
    fi
}

# Function to apply secrets
apply_secrets() {
    echo -e "${YELLOW}🔐 Applying secrets...${NC}"
    
    # Check if secrets file exists
    if [ ! -f "k8s/secrets.yaml" ]; then
        echo -e "${RED}❌ secrets.yaml not found. Please create it with your actual secrets.${NC}"
        exit 1
    fi
    
    kubectl apply -f k8s/secrets.yaml
    echo -e "${GREEN}✅ Secrets applied${NC}"
}

# Function to apply configmaps
apply_configmaps() {
    echo -e "${YELLOW}⚙️  Applying configmaps...${NC}"
    
    kubectl apply -f k8s/configmap.yaml
    echo -e "${GREEN}✅ ConfigMaps applied${NC}"
}

# Function to deploy database services
deploy_databases() {
    echo -e "${YELLOW}🗄️  Deploying databases...${NC}"
    
    # Deploy MongoDB
    kubectl apply -f k8s/mongodb.yaml
    
    # Deploy Redis
    kubectl apply -f k8s/redis.yaml
    
    echo -e "${GREEN}✅ Database services deployed${NC}"
    
    # Wait for databases to be ready
    echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=pet-health-mongo -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=pet-health-redis -n $NAMESPACE --timeout=300s
    
    echo -e "${GREEN}✅ Databases are ready${NC}"
}

# Function to deploy application services
deploy_applications() {
    echo -e "${YELLOW}🚀 Deploying applications...${NC}"
    
    # Deploy backend
    kubectl apply -f k8s/backend.yaml
    
    # Deploy frontend
    kubectl apply -f k8s/frontend.yaml
    
    # Deploy nginx
    kubectl apply -f k8s/nginx.yaml
    
    echo -e "${GREEN}✅ Application services deployed${NC}"
    
    # Wait for applications to be ready
    echo -e "${YELLOW}⏳ Waiting for applications to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=pet-health-backend -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=pet-health-frontend -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=pet-health-nginx -n $NAMESPACE --timeout=300s
    
    echo -e "${GREEN}✅ Applications are ready${NC}"
}

# Function to deploy ingress
deploy_ingress() {
    echo -e "${YELLOW}🌐 Deploying ingress...${NC}"
    
    # Check if cert-manager is installed
    if kubectl get namespace cert-manager &> /dev/null; then
        kubectl apply -f k8s/ingress.yaml
        echo -e "${GREEN}✅ Ingress deployed with SSL${NC}"
    else
        echo -e "${YELLOW}⚠️  cert-manager not found. Skipping SSL configuration.${NC}"
        echo -e "${YELLOW}💡 Install cert-manager for automatic SSL certificates${NC}"
    fi
}

# Function to show deployment status
show_status() {
    echo -e "${GREEN}📊 Deployment Status${NC}"
    echo "==================="
    
    echo -e "${YELLOW}Pods:${NC}"
    kubectl get pods -n $NAMESPACE
    
    echo ""
    echo -e "${YELLOW}Services:${NC}"
    kubectl get services -n $NAMESPACE
    
    echo ""
    echo -e "${YELLOW}Ingress:${NC}"
    kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress found"
    
    echo ""
    echo -e "${YELLOW}Persistent Volume Claims:${NC}"
    kubectl get pvc -n $NAMESPACE
}

# Function to get service URLs
get_urls() {
    echo -e "${GREEN}🔗 Service URLs${NC}"
    echo "=============="
    
    # Get LoadBalancer IP
    EXTERNAL_IP=$(kubectl get service pet-health-nginx -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    if [ "$EXTERNAL_IP" != "pending" ] && [ "$EXTERNAL_IP" != "" ]; then
        echo "Frontend: http://$EXTERNAL_IP"
        echo "Backend API: http://$EXTERNAL_IP/api"
    else
        echo "External IP is pending. Use port-forward for testing:"
        echo "kubectl port-forward -n $NAMESPACE service/pet-health-nginx 8080:80"
        echo "Then access: http://localhost:8080"
    fi
}

# Function to cleanup deployment
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up deployment...${NC}"
    
    kubectl delete -f k8s/ingress.yaml 2>/dev/null || true
    kubectl delete -f k8s/nginx.yaml 2>/dev/null || true
    kubectl delete -f k8s/frontend.yaml 2>/dev/null || true
    kubectl delete -f k8s/backend.yaml 2>/dev/null || true
    kubectl delete -f k8s/redis.yaml 2>/dev/null || true
    kubectl delete -f k8s/mongodb.yaml 2>/dev/null || true
    kubectl delete -f k8s/configmap.yaml 2>/dev/null || true
    kubectl delete -f k8s/secrets.yaml 2>/dev/null || true
    kubectl delete namespace $NAMESPACE 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show logs
show_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        echo "Available services: backend, frontend, mongo, redis, nginx"
        return 1
    fi
    
    kubectl logs -f -l app=pet-health-$service -n $NAMESPACE
}

# Function to scale deployment
scale_deployment() {
    local service=$1
    local replicas=$2
    
    if [ -z "$service" ] || [ -z "$replicas" ]; then
        echo "Usage: scale <service> <replicas>"
        echo "Available services: backend, frontend, nginx"
        return 1
    fi
    
    kubectl scale deployment pet-health-$service --replicas=$replicas -n $NAMESPACE
    echo -e "${GREEN}✅ Scaled $service to $replicas replicas${NC}"
}

# Main deployment function
deploy() {
    check_kubectl
    create_namespace
    apply_secrets
    apply_configmaps
    deploy_databases
    deploy_applications
    deploy_ingress
    
    echo ""
    show_status
    echo ""
    get_urls
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${YELLOW}💡 Useful commands:${NC}"
    echo "  View status: $0 status"
    echo "  View logs: $0 logs <service>"
    echo "  Scale service: $0 scale <service> <replicas>"
    echo "  Cleanup: $0 cleanup"
}

# Handle script arguments
case $1 in
    "deploy"|"")
        deploy
        ;;
    "status")
        show_status
        ;;
    "urls")
        get_urls
        ;;
    "logs")
        show_logs "$2"
        ;;
    "scale")
        scale_deployment "$2" "$3"
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"--help"|"-h")
        echo "Kubernetes Deployment Script for Pet Health Platform"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy          - Deploy the entire application (default)"
        echo "  status          - Show deployment status"
        echo "  urls            - Show service URLs"
        echo "  logs <service>  - Show logs for a service"
        echo "  scale <service> <replicas> - Scale a service"
        echo "  cleanup         - Remove all deployed resources"
        echo "  help            - Show this help message"
        echo ""
        echo "Services: backend, frontend, mongo, redis, nginx"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac