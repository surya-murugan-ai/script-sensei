#!/bin/bash

# Immediate database backup script
# Creates a timestamped backup of the PostgreSQL database

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/scriptsensei_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="scriptsensei-db"
DB_NAME="scriptsensei"
DB_USER="postgres"

echo "🗄️  Starting database backup..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Database container '${CONTAINER_NAME}' is not running"
    echo "   Start it with: docker-compose up -d postgres"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create the backup
echo "📦 Creating backup: ${BACKUP_FILE}"
docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "   File: ${BACKUP_FILE}"
    echo "   Size: ${BACKUP_SIZE}"
    
    # Verify backup integrity
    if grep -q "PostgreSQL database dump complete" "${BACKUP_FILE}"; then
        echo "✅ Backup integrity verified"
    else
        echo "⚠️  Warning: Backup may be incomplete"
    fi
else
    echo "❌ Backup failed!"
    exit 1
fi

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lh "${BACKUP_DIR}"/*.sql 2>/dev/null | tail -5 || echo "   No previous backups found"

