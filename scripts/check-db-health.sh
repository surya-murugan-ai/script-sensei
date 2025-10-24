#!/bin/bash

# Database Health Check Script for ScriptSensei
# This script checks if the database is healthy and accessible

set -e

echo "🔍 ScriptSensei Database Health Check"
echo "======================================"

# Check if containers are running
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🗄️ Database Connection Test:"
if docker-compose exec -T postgres pg_isready -U postgres; then
    echo "✅ PostgreSQL is ready and accepting connections"
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

echo ""
echo "📋 Database List:"
docker-compose exec -T postgres psql -U postgres -c "\l"

echo ""
echo "🔍 ScriptSensei Database Status:"
DB_EXISTS=$(docker-compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='scriptsensei'" || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database 'scriptsensei' exists"
    
    # Check if tables exist
    TABLES_COUNT=$(docker-compose exec -T postgres psql -U postgres -d scriptsensei -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" || echo "0")
    echo "📊 Tables in database: $TABLES_COUNT"
    
    if [ "$TABLES_COUNT" -gt "0" ]; then
        echo "✅ Database schema is properly initialized"
        
        # List the tables
        echo "📋 Tables in scriptsensei database:"
        docker-compose exec -T postgres psql -U postgres -d scriptsensei -c "\dt"
    else
        echo "⚠️ Database exists but has no tables - migrations needed"
    fi
else
    echo "❌ Database 'scriptsensei' does not exist"
    echo "💡 Run: npm run db:init to create and initialize the database"
fi

echo ""
echo "✅ Database health check completed!"
