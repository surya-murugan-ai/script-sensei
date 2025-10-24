#!/bin/bash

# Database Restore Script for ScriptSensei
# This script restores a PostgreSQL database from backup

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Available backups:"
    ls -la ./backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will replace all data in the database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "🔄 Restoring database from backup..."

# Stop the app container to prevent conflicts
docker-compose stop app

# Drop and recreate the database
docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS scriptsensei;"
docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE scriptsensei;"

# Restore from backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U postgres -d scriptsensei
else
    docker-compose exec -T postgres psql -U postgres -d scriptsensei < "$BACKUP_FILE"
fi

# Restart the app container
docker-compose start app

echo "✅ Database restored successfully!"
echo "🔄 Application restarted"
