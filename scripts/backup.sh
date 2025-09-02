#!/bin/bash

# Backup Script for Pet Health Platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGO_CONTAINER="pet-health-mongo"
REDIS_CONTAINER="pet-health-redis"

echo -e "${GREEN}💾 Pet Health Platform Backup${NC}"
echo "=============================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to backup MongoDB
backup_mongodb() {
    echo -e "${YELLOW}📦 Backing up MongoDB...${NC}"
    
    local backup_file="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.gz"
    
    if docker exec "$MONGO_CONTAINER" mongodump --archive --gzip --db pet-health > "$backup_file"; then
        echo -e "${GREEN}✅ MongoDB backup completed: $backup_file${NC}"
        echo "Size: $(du -h "$backup_file" | cut -f1)"
    else
        echo -e "${RED}❌ MongoDB backup failed${NC}"
        return 1
    fi
}

# Function to backup Redis
backup_redis() {
    echo -e "${YELLOW}📦 Backing up Redis...${NC}"
    
    local backup_file="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
    
    # Trigger Redis save
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
    
    # Wait for save to complete
    while [ "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" = "$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)" ]; do
        sleep 1
    done
    
    # Copy the dump file
    if docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$backup_file"; then
        echo -e "${GREEN}✅ Redis backup completed: $backup_file${NC}"
        echo "Size: $(du -h "$backup_file" | cut -f1)"
    else
        echo -e "${RED}❌ Redis backup failed${NC}"
        return 1
    fi
}

# Function to backup uploaded files
backup_uploads() {
    echo -e "${YELLOW}📦 Backing up uploaded files...${NC}"
    
    local backup_file="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
    
    if [ -d "./backend/uploads" ]; then
        if tar -czf "$backup_file" -C "./backend" uploads/; then
            echo -e "${GREEN}✅ Uploads backup completed: $backup_file${NC}"
            echo "Size: $(du -h "$backup_file" | cut -f1)"
        else
            echo -e "${RED}❌ Uploads backup failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  No uploads directory found${NC}"
    fi
}

# Function to backup configuration
backup_config() {
    echo -e "${YELLOW}📦 Backing up configuration...${NC}"
    
    local backup_file="$BACKUP_DIR/config_backup_$TIMESTAMP.tar.gz"
    
    # Create temporary directory for config files
    local temp_dir=$(mktemp -d)
    
    # Copy configuration files
    cp .env "$temp_dir/" 2>/dev/null || echo "No .env file found"
    cp docker-compose*.yml "$temp_dir/" 2>/dev/null || true
    cp -r docker/ "$temp_dir/" 2>/dev/null || true
    
    if tar -czf "$backup_file" -C "$temp_dir" .; then
        echo -e "${GREEN}✅ Configuration backup completed: $backup_file${NC}"
        echo "Size: $(du -h "$backup_file" | cut -f1)"
    else
        echo -e "${RED}❌ Configuration backup failed${NC}"
        return 1
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Function to create full backup
full_backup() {
    echo -e "${GREEN}🔄 Creating full backup...${NC}"
    
    local exit_code=0
    
    backup_mongodb || exit_code=1
    backup_redis || exit_code=1
    backup_uploads || exit_code=1
    backup_config || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 Full backup completed successfully!${NC}"
        
        # Create backup manifest
        local manifest_file="$BACKUP_DIR/backup_manifest_$TIMESTAMP.txt"
        {
            echo "Pet Health Platform Backup Manifest"
            echo "Timestamp: $(date)"
            echo "Backup Directory: $BACKUP_DIR"
            echo ""
            echo "Files:"
            ls -la "$BACKUP_DIR"/*"$TIMESTAMP"* 2>/dev/null || echo "No backup files found"
        } > "$manifest_file"
        
        echo "Backup manifest created: $manifest_file"
    else
        echo -e "${RED}⚠️  Backup completed with errors${NC}"
    fi
    
    return $exit_code
}

# Function to restore from backup
restore_backup() {
    local backup_timestamp=$1
    
    if [ -z "$backup_timestamp" ]; then
        echo -e "${RED}❌ Please specify backup timestamp${NC}"
        echo "Available backups:"
        ls -la "$BACKUP_DIR" | grep backup_manifest | awk '{print $9}' | sed 's/backup_manifest_//' | sed 's/.txt//'
        return 1
    fi
    
    echo -e "${YELLOW}🔄 Restoring from backup: $backup_timestamp${NC}"
    
    # Restore MongoDB
    local mongo_backup="$BACKUP_DIR/mongodb_backup_$backup_timestamp.gz"
    if [ -f "$mongo_backup" ]; then
        echo "Restoring MongoDB..."
        docker exec -i "$MONGO_CONTAINER" mongorestore --archive --gzip --drop < "$mongo_backup"
        echo -e "${GREEN}✅ MongoDB restored${NC}"
    fi
    
    # Restore Redis
    local redis_backup="$BACKUP_DIR/redis_backup_$backup_timestamp.rdb"
    if [ -f "$redis_backup" ]; then
        echo "Restoring Redis..."
        docker cp "$redis_backup" "$REDIS_CONTAINER:/data/dump.rdb"
        docker restart "$REDIS_CONTAINER"
        echo -e "${GREEN}✅ Redis restored${NC}"
    fi
    
    # Restore uploads
    local uploads_backup="$BACKUP_DIR/uploads_backup_$backup_timestamp.tar.gz"
    if [ -f "$uploads_backup" ]; then
        echo "Restoring uploads..."
        tar -xzf "$uploads_backup" -C "./backend/"
        echo -e "${GREEN}✅ Uploads restored${NC}"
    fi
    
    echo -e "${GREEN}🎉 Restore completed!${NC}"
}

# Function to cleanup old backups
cleanup_backups() {
    local days=${1:-7}
    
    echo -e "${YELLOW}🧹 Cleaning up backups older than $days days...${NC}"
    
    find "$BACKUP_DIR" -name "*backup*" -type f -mtime +$days -delete
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to list backups
list_backups() {
    echo -e "${YELLOW}📋 Available backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep backup_manifest | while read -r line; do
            local file=$(echo "$line" | awk '{print $9}')
            local timestamp=$(echo "$file" | sed 's/backup_manifest_//' | sed 's/.txt//')
            local date=$(echo "$timestamp" | sed 's/_/ /' | sed 's/\(.*\)\(.\{6\}\)/\1 \2/')
            echo "  $timestamp ($date)"
        done
    else
        echo "No backup directory found"
    fi
}

# Main function
main() {
    case $1 in
        "full"|"")
            full_backup
            ;;
        "mongodb"|"mongo")
            backup_mongodb
            ;;
        "redis")
            backup_redis
            ;;
        "uploads")
            backup_uploads
            ;;
        "config")
            backup_config
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_backups "$2"
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  full              - Create full backup (default)"
            echo "  mongodb|mongo     - Backup MongoDB only"
            echo "  redis             - Backup Redis only"
            echo "  uploads           - Backup uploaded files only"
            echo "  config            - Backup configuration only"
            echo "  restore <timestamp> - Restore from backup"
            echo "  list              - List available backups"
            echo "  cleanup [days]    - Remove backups older than N days (default: 7)"
            echo "  help              - Show this help message"
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"