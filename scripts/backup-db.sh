#!/bin/bash

# Database Backup Script for ScriptSensei
# This script creates a backup of the PostgreSQL database

set -e

echo "💾 Creating database backup..."

# Create backups directory if it doesn't exist
mkdir -p ./backups

# Create backup with timestamp
BACKUP_FILE="./backups/scriptsensei_backup_$(date +%Y%m%d_%H%M%S).sql"

# Create database backup
docker-compose exec -T postgres pg_dump -U postgres scriptsensei > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "✅ Database backup created: ${BACKUP_FILE}.gz"

# Keep only the last 7 backups
echo "🧹 Cleaning old backups (keeping last 7)..."
cd backups
ls -t scriptsensei_backup_*.sql.gz | tail -n +8 | xargs -r rm
cd ..

echo "✅ Backup process completed!"
