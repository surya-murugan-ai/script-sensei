# Database Logging and Monitoring Guide

## Overview

I've created a comprehensive database logging system to help you track what's happening with your database and understand why it might be getting deleted.

## What's Been Added

### 1. **Database Logger (`server/dbLogger.ts`)**
- **Continuous monitoring** every 30 seconds
- **Connection pool tracking** (total, idle, waiting connections)
- **Data operation logging** (insert, update, delete with details)
- **Health status detection** (healthy, warning, critical)
- **Data loss detection** (empty database, low counts)

### 2. **Database Health Service (`server/dbHealth.ts`)**
- **Trend analysis** for data loss patterns
- **Health history** tracking (last 100 checks)
- **Detailed reporting** with statistics
- **Data loss alerts** when prescription counts drop

### 3. **Enhanced Health Endpoints**
- **`/api/health`** - Now includes database health info
- **`/api/db/health`** - Detailed database statistics
- **`/api/db/history`** - Health check history

### 4. **Monitoring Script (`scripts/monitor-db-detailed.sh`)**
- **Real-time monitoring** with customizable intervals
- **Data loss detection** and alerts
- **Connection monitoring** and database size tracking
- **Logging to file** with timestamps

## How to Use

### 1. **Start the Application with Logging**
```bash
# Build and start with database monitoring
npm run build
docker-compose up -d --build

# Watch the logs for database monitoring
docker-compose logs -f app
```

**Look for these log messages:**
```
🔍 Starting database monitoring (every 30000ms)
✅ DB Health: Database is healthy
📊 DB Metrics: 5 prescriptions, 12 results, 2.1 MB, 3/10 connections
```

### 2. **Check Database Health via API**
```bash
# Basic health check (includes database info)
curl http://localhost:5000/api/health | jq

# Detailed database statistics
curl http://localhost:5000/api/db/health | jq

# Database health history
curl http://localhost:5000/api/db/history | jq
```

### 3. **Use the Monitoring Script**
```bash
# Make executable (on Windows, use Git Bash or WSL)
chmod +x scripts/monitor-db-detailed.sh

# Continuous monitoring (every 30 seconds)
./scripts/monitor-db-detailed.sh monitor

# Quick health check
./scripts/monitor-db-detailed.sh health

# Check for data loss
./scripts/monitor-db-detailed.sh data-loss

# Monitor connections
./scripts/monitor-db-detailed.sh connections
```

### 4. **Monitor for Data Loss**
The system will automatically detect and log:
- **Empty database** (0 prescriptions, 0 results)
- **Sudden drops** in prescription count
- **Deletion operations** with detailed logging
- **Connection issues** that might cause data loss

## What You'll See in Logs

### **Normal Operation:**
```
[2025-10-27 12:45:30] ✅ DB Health: Database is healthy
[2025-10-27 12:45:30] 📊 DB Metrics: 5 prescriptions, 12 results, 2.1 MB, 3/10 connections
[2025-10-27 12:45:30] 🔌 DB Connection: connect
[2025-10-27 12:45:35] ➕ Data Operation: insert 1 rows in prescriptions - Created prescription abc123
```

### **Data Loss Detection:**
```
[2025-10-27 12:46:00] ❌ DB Health: Database appears empty - possible data loss!
[2025-10-27 12:46:00] 🚨 CRITICAL: Database appears empty - possible data loss!
[2025-10-27 12:46:00] ⚠️ DELETION DETECTED: 1 rows deleted from prescriptions at 2025-10-27T12:45:45.123Z
```

### **Connection Issues:**
```
[2025-10-27 12:47:00] ⚠️ DB Health: High connection usage detected
[2025-10-27 12:47:00] 📊 DB Metrics: 8 prescriptions, 15 results, 2.3 MB, 9/10 connections
[2025-10-27 12:47:00] ❌ DB Connection: error - connection timeout
```

## Key Features for Debugging

### 1. **Data Operation Tracking**
Every database operation is logged:
- **Prescription creation** with ID
- **Prescription deletion** with status and ID
- **Status updates** (processing, completed, failed)
- **Extraction result operations**

### 2. **Health Status Monitoring**
- **Healthy**: Normal operation
- **Warning**: High connection usage, low data counts
- **Critical**: Empty database, connection failures

### 3. **Data Loss Pattern Detection**
- **Sudden drops** in prescription count
- **Empty database** detection
- **Historical analysis** of data changes

### 4. **Connection Pool Monitoring**
- **Total connections** vs max limit
- **Idle connections** available
- **Waiting clients** queue
- **Connection errors** and timeouts

## Troubleshooting Database Deletion

### **Check Recent Logs:**
```bash
# Look for deletion operations
docker-compose logs app | grep "DELETION DETECTED"

# Check for data loss alerts
docker-compose logs app | grep "DATA LOSS"

# Monitor health status changes
docker-compose logs app | grep "DB Health"
```

### **Check Database State:**
```bash
# Get current prescription count
docker exec scriptsensei-db psql -U postgres scriptsensei -c "SELECT COUNT(*) FROM prescriptions;"

# Check recent uploads
docker exec scriptsensei-db psql -U postgres scriptsensei -c "SELECT id, file_name, uploaded_at FROM prescriptions ORDER BY uploaded_at DESC LIMIT 5;"

# Check for any schema changes
docker exec scriptsensei-db psql -U postgres scriptsensei -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### **Monitor in Real-Time:**
```bash
# Start detailed monitoring
./scripts/monitor-db-detailed.sh monitor 10  # Every 10 seconds

# Watch for patterns
tail -f logs/db-monitor-$(date +%Y%m%d).log
```

## API Endpoints for Monitoring

### **GET /api/health**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:45:30.123Z",
  "uptime": 3600,
  "database": {
    "status": "healthy",
    "message": "Database is healthy",
    "prescriptions": 5,
    "extractionResults": 12,
    "databaseSize": "2.1 MB",
    "connections": "3/10",
    "lastActivity": "2025-10-27T12:30:00.000Z",
    "uptime": "2h 15m",
    "dataLoss": {
      "hasDataLoss": false,
      "message": "No data loss detected"
    }
  }
}
```

### **GET /api/db/health**
```json
{
  "current": {
    "status": "healthy",
    "message": "Database is healthy",
    "metrics": { ... }
  },
  "dataLoss": {
    "hasDataLoss": false,
    "message": "No data loss detected"
  },
  "history": {
    "totalChecks": 45,
    "lastCheck": "2025-10-27T12:45:30.123Z",
    "averagePrescriptions": 5.2,
    "averageExtractionResults": 12.1
  }
}
```

## Next Steps

1. **Deploy the logging system:**
   ```bash
   npm run build
   docker-compose up -d --build
   ```

2. **Monitor for a few hours:**
   ```bash
   docker-compose logs -f app | grep -E "(DB Health|Data Operation|DELETION|DATA LOSS)"
   ```

3. **Check if data loss occurs:**
   - Upload some prescriptions
   - Wait and see if they disappear
   - Check the logs for deletion patterns

4. **Analyze the patterns:**
   - Look for timing patterns
   - Check for error messages
   - Monitor connection pool usage

This comprehensive logging system will help you identify exactly when and why your database is getting deleted. The logs will show you the sequence of events leading to data loss, making it much easier to debug the root cause.

Would you like me to help you deploy this and start monitoring?
