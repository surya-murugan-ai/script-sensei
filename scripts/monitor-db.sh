#!/bin/bash

# Database Monitoring Script for ScriptSensei
# This script monitors database health and data persistence

set -e

echo "🔍 ScriptSensei Database Monitor"
echo "================================"

# Check if containers are running
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "💾 Database Volume Status:"
docker volume ls | grep postgres_data || echo "❌ postgres_data volume not found"

echo ""
echo "🗄️ Database Connection Test:"
if docker-compose exec -T postgres pg_isready -U postgres; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
fi

echo ""
echo "📈 Database Size:"
docker-compose exec -T postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('scriptsensei'));"

echo ""
echo "📋 Table Count:"
docker-compose exec -T postgres psql -U postgres -d scriptsensei -c "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

echo ""
echo "📁 Backup Files:"
ls -la ./backups/*.sql.gz 2>/dev/null || echo "No backup files found"

echo ""
echo "⏰ Last Backup:"
if [ -f "./backups" ]; then
    ls -lt ./backups/*.sql.gz 2>/dev/null | head -1 || echo "No backups found"
else
    echo "Backups directory not found"
fi

echo ""
echo "🔄 Recent Container Restarts:"
docker-compose logs --tail=10 app | grep -i restart || echo "No recent restarts found"

echo ""
echo "✅ Monitoring complete!"
