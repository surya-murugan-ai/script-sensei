#!/bin/bash

# Detailed Database Monitoring Script
# Monitors database health and logs detailed information

CONTAINER_NAME="scriptsensei-app"
LOG_FILE="./logs/db-monitor-$(date +%Y%m%d).log"

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🔍 Starting detailed database monitoring..."
echo "📝 Logs will be saved to: $LOG_FILE"
echo "⏰ Started at: $(date)"
echo "=========================================="

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_with_timestamp "❌ Container $CONTAINER_NAME is not running"
        return 1
    fi
    return 0
}

# Function to get database health
get_db_health() {
    log_with_timestamp "📊 Checking database health..."
    
    # Get basic health
    local health_response=$(docker exec $CONTAINER_NAME curl -s http://localhost:5000/api/health 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$health_response" ]; then
        echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
    else
        log_with_timestamp "❌ Failed to get health response"
        return 1
    fi
}

# Function to get detailed database stats
get_db_stats() {
    log_with_timestamp "📈 Getting detailed database statistics..."
    
    local stats_response=$(docker exec $CONTAINER_NAME curl -s http://localhost:5000/api/db/health 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$stats_response" ]; then
        echo "$stats_response" | jq '.' 2>/dev/null || echo "$stats_response"
    else
        log_with_timestamp "❌ Failed to get stats response"
        return 1
    fi
}

# Function to check for data loss
check_data_loss() {
    log_with_timestamp "🔍 Checking for data loss patterns..."
    
    local history_response=$(docker exec $CONTAINER_NAME curl -s http://localhost:5000/api/db/history 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$history_response" ]; then
        local data_loss=$(echo "$history_response" | jq -r '.history[-1].health.dataLoss.hasDataLoss' 2>/dev/null)
        if [ "$data_loss" = "true" ]; then
            log_with_timestamp "🚨 DATA LOSS DETECTED!"
            echo "$history_response" | jq '.history[-1].health.dataLoss' 2>/dev/null
        else
            log_with_timestamp "✅ No data loss detected"
        fi
    else
        log_with_timestamp "❌ Failed to get history response"
    fi
}

# Function to monitor database connections
monitor_connections() {
    log_with_timestamp "🔌 Checking database connections..."
    
    local connection_info=$(docker exec $CONTAINER_NAME node -e "
        const { pool } = require('./dist/db.js');
        console.log(JSON.stringify({
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount,
            max: pool.options.max
        }));
    " 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$connection_info" ]; then
        echo "$connection_info" | jq '.' 2>/dev/null || echo "$connection_info"
    else
        log_with_timestamp "❌ Failed to get connection info"
    fi
}

# Function to check database size
check_db_size() {
    log_with_timestamp "💾 Checking database size..."
    
    local size_info=$(docker exec scriptsensei-db psql -U postgres scriptsensei -c "
        SELECT 
            pg_size_pretty(pg_database_size('scriptsensei')) as database_size,
            pg_size_pretty(pg_total_relation_size('prescriptions')) as prescriptions_size,
            pg_size_pretty(pg_total_relation_size('extraction_results')) as extraction_results_size;
    " 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$size_info"
    else
        log_with_timestamp "❌ Failed to get database size"
    fi
}

# Function to check for recent deletions
check_recent_deletions() {
    log_with_timestamp "🗑️ Checking for recent deletions..."
    
    local deletion_info=$(docker exec scriptsensei-db psql -U postgres scriptsensei -c "
        SELECT 
            COUNT(*) as total_prescriptions,
            COUNT(CASE WHEN uploaded_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
            COUNT(CASE WHEN uploaded_at > NOW() - INTERVAL '1 day' THEN 1 END) as last_day,
            MAX(uploaded_at) as last_upload
        FROM prescriptions;
    " 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$deletion_info"
    else
        log_with_timestamp "❌ Failed to check recent deletions"
    fi
}

# Main monitoring loop
main() {
    local interval=${1:-30}  # Default 30 seconds
    
    log_with_timestamp "🚀 Starting database monitoring (interval: ${interval}s)"
    
    while true; do
        echo ""
        log_with_timestamp "=== DATABASE MONITORING CYCLE ==="
        
        # Check if container is running
        if ! check_container; then
            log_with_timestamp "⏳ Waiting for container to start..."
            sleep 10
            continue
        fi
        
        # Get database health
        get_db_health
        
        # Get detailed stats
        get_db_stats
        
        # Check for data loss
        check_data_loss
        
        # Monitor connections
        monitor_connections
        
        # Check database size
        check_db_size
        
        # Check recent deletions
        check_recent_deletions
        
        log_with_timestamp "=== END CYCLE ==="
        log_with_timestamp "⏳ Waiting ${interval} seconds..."
        
        sleep $interval
    done
}

# Handle script arguments
case "${1:-monitor}" in
    "monitor")
        main "${2:-30}"
        ;;
    "health")
        check_container && get_db_health
        ;;
    "stats")
        check_container && get_db_stats
        ;;
    "data-loss")
        check_container && check_data_loss
        ;;
    "connections")
        check_container && monitor_connections
        ;;
    "size")
        check_db_size
        ;;
    "deletions")
        check_recent_deletions
        ;;
    "help"|"-h"|"--help")
        echo "Database Monitoring Script"
        echo ""
        echo "Usage: $0 [command] [interval]"
        echo ""
        echo "Commands:"
        echo "  monitor     - Continuous monitoring (default)"
        echo "  health      - Get current health status"
        echo "  stats       - Get detailed statistics"
        echo "  data-loss   - Check for data loss patterns"
        echo "  connections - Check connection pool status"
        echo "  size        - Check database sizes"
        echo "  deletions   - Check recent deletions"
        echo "  help        - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 monitor 60    # Monitor every 60 seconds"
        echo "  $0 health        # Quick health check"
        echo "  $0 data-loss     # Check for data loss"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
