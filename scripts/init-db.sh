#!/bin/bash

# Database Initialization Script for ScriptSensei
# This script ensures the database is properly initialized

set -e

echo "🗄️ ScriptSensei Database Initialization"
echo "========================================"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres; do
  echo "⏳ PostgreSQL is unavailable - sleeping..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Check if database exists
echo "🔍 Checking if scriptsensei database exists..."
DB_EXISTS=$(docker-compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='scriptsensei'" || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database 'scriptsensei' already exists"
else
    echo "📝 Creating database 'scriptsensei'..."
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE scriptsensei;"
    echo "✅ Database 'scriptsensei' created successfully"
fi

# Check if tables exist
echo "🔍 Checking if tables exist..."
TABLES_EXIST=$(docker-compose exec -T postgres psql -U postgres -d scriptsensei -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" || echo "0")

if [ "$TABLES_EXIST" -gt "0" ]; then
    echo "✅ Database tables already exist ($TABLES_EXIST tables found)"
else
    echo "📝 Running database migrations..."
    docker-compose exec app npm run db:push
    echo "✅ Database migrations completed successfully"
fi

echo "🎉 Database initialization completed successfully!"
