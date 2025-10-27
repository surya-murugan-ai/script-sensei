import { log } from './utils';
import { pool } from './db';

export interface DatabaseMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  databaseSize: string;
  tableCount: number;
  prescriptionCount: number;
  extractionResultCount: number;
  lastActivity: Date;
  uptime: string;
}

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  metrics: DatabaseMetrics;
  timestamp: Date;
}

class DatabaseLogger {
  private isLogging = false;
  private logInterval: NodeJS.Timeout | null = null;

  /**
   * Start continuous database monitoring
   */
  startLogging(intervalMs: number = 30000) { // Default 30 seconds
    if (this.isLogging) {
      log('Database logging already active');
      return;
    }

    this.isLogging = true;
    log(`🔍 Starting database monitoring (every ${intervalMs}ms)`);

    // Log immediately
    this.logDatabaseStatus();

    // Then log at intervals
    this.logInterval = setInterval(() => {
      this.logDatabaseStatus();
    }, intervalMs);
  }

  /**
   * Stop database monitoring
   */
  stopLogging() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
    this.isLogging = false;
    log('🔍 Database monitoring stopped');
  }

  /**
   * Get comprehensive database health check
   */
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const metrics = await this.getDatabaseMetrics();
      
      // Determine health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = 'Database is healthy';

      // Check connection pool
      if (metrics.totalConnections >= 9) { // Close to max of 10
        status = 'warning';
        message = 'High connection usage detected';
      }

      // Check if database is empty (potential deletion indicator)
      if (metrics.prescriptionCount === 0 && metrics.extractionResultCount === 0) {
        status = 'critical';
        message = 'Database appears empty - possible data loss!';
      }

      // Check for very low counts (might indicate partial deletion)
      if (metrics.prescriptionCount < 5 && metrics.prescriptionCount > 0) {
        status = 'warning';
        message = 'Low prescription count - monitor for data loss';
      }

      return {
        status,
        message,
        metrics,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Database health check failed: ${error}`,
        metrics: {
          totalConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          databaseSize: 'Unknown',
          tableCount: 0,
          prescriptionCount: 0,
          extractionResultCount: 0,
          lastActivity: new Date(),
          uptime: 'Unknown'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get detailed database metrics
   */
  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const client = await pool.connect();
    
    try {
      // Get connection pool stats
      const totalConnections = pool.totalCount;
      const idleConnections = pool.idleCount;
      const waitingClients = pool.waitingCount;

      // Get database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const databaseSize = sizeResult.rows[0]?.size || 'Unknown';

      // Get table count
      const tableResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      const tableCount = parseInt(tableResult.rows[0]?.count || '0');

      // Get prescription count
      const prescriptionResult = await client.query(`
        SELECT COUNT(*) as count FROM prescriptions
      `);
      const prescriptionCount = parseInt(prescriptionResult.rows[0]?.count || '0');

      // Get extraction result count
      const extractionResult = await client.query(`
        SELECT COUNT(*) as count FROM extraction_results
      `);
      const extractionResultCount = parseInt(extractionResult.rows[0]?.count || '0');

      // Get last activity (most recent prescription upload)
      const lastActivityResult = await client.query(`
        SELECT MAX(uploaded_at) as last_activity FROM prescriptions
      `);
      const lastActivity = lastActivityResult.rows[0]?.last_activity || new Date();

      // Get database uptime
      const uptimeResult = await client.query(`
        SELECT pg_postmaster_start_time() as start_time
      `);
      const startTime = uptimeResult.rows[0]?.start_time;
      const uptime = startTime 
        ? this.formatUptime(Date.now() - new Date(startTime).getTime())
        : 'Unknown';

      return {
        totalConnections,
        idleConnections,
        waitingClients,
        databaseSize,
        tableCount,
        prescriptionCount,
        extractionResultCount,
        lastActivity: new Date(lastActivity),
        uptime
      };
    } finally {
      client.release();
    }
  }

  /**
   * Log current database status
   */
  private async logDatabaseStatus() {
    try {
      const health = await this.getDatabaseHealth();
      
      const statusEmoji = {
        healthy: '✅',
        warning: '⚠️',
        critical: '❌'
      }[health.status];

      log(`${statusEmoji} DB Health: ${health.message}`);
      log(`📊 DB Metrics: ${health.metrics.prescriptionCount} prescriptions, ${health.metrics.extractionResultCount} results, ${health.metrics.databaseSize}, ${health.metrics.totalConnections}/${pool.options.max} connections`);
      
      // Log critical issues immediately
      if (health.status === 'critical') {
        log(`🚨 CRITICAL: ${health.message}`);
        log(`📈 Last activity: ${health.metrics.lastActivity.toISOString()}`);
        log(`⏱️  DB uptime: ${health.metrics.uptime}`);
      }

      // Log warning details
      if (health.status === 'warning') {
        log(`⚠️  WARNING: ${health.message}`);
      }

    } catch (error) {
      log(`❌ Database logging error: ${error}`);
    }
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Log database schema changes (for migration tracking)
   */
  async logSchemaChange(operation: string, details: string) {
    const timestamp = new Date().toISOString();
    log(`🔧 Schema Change [${timestamp}]: ${operation} - ${details}`);
    
    // Also log to a dedicated schema log file if needed
    // This helps track when and why schema changes occur
  }

  /**
   * Log database connection events
   */
  logConnectionEvent(event: 'connect' | 'disconnect' | 'error', details?: string) {
    const timestamp = new Date().toISOString();
    const emoji = {
      connect: '🔌',
      disconnect: '🔌',
      error: '❌'
    }[event];
    
    log(`${emoji} DB Connection [${timestamp}]: ${event}${details ? ` - ${details}` : ''}`);
  }

  /**
   * Log data operations (for tracking deletions)
   */
  async logDataOperation(operation: 'insert' | 'update' | 'delete', table: string, count: number, details?: string) {
    const timestamp = new Date().toISOString();
    const emoji = {
      insert: '➕',
      update: '✏️',
      delete: '🗑️'
    }[operation];
    
    log(`${emoji} Data Operation [${timestamp}]: ${operation} ${count} rows in ${table}${details ? ` - ${details}` : ''}`);
    
    // Log deletions with extra detail
    if (operation === 'delete') {
      log(`⚠️  DELETION DETECTED: ${count} rows deleted from ${table} at ${timestamp}`);
    }
  }
}

export const dbLogger = new DatabaseLogger();

// Set up connection event logging
pool.on('connect', () => {
  dbLogger.logConnectionEvent('connect');
});

pool.on('error', (err) => {
  dbLogger.logConnectionEvent('error', err.message);
});

pool.on('remove', () => {
  dbLogger.logConnectionEvent('disconnect');
});
