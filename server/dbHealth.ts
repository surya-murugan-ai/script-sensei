import { dbLogger } from './dbLogger';
import { log } from './utils';

/**
 * Database Health Monitoring Service
 * Provides detailed database health information and monitoring
 */

export class DatabaseHealthService {
  private static instance: DatabaseHealthService;
  private healthHistory: Array<{ timestamp: Date; health: any }> = [];
  private maxHistorySize = 100; // Keep last 100 health checks

  static getInstance(): DatabaseHealthService {
    if (!DatabaseHealthService.instance) {
      DatabaseHealthService.instance = new DatabaseHealthService();
    }
    return DatabaseHealthService.instance;
  }

  /**
   * Get current database health status
   */
  async getCurrentHealth() {
    const health = await dbLogger.getDatabaseHealth();
    
    // Store in history
    this.healthHistory.push({
      timestamp: new Date(),
      health
    });
    
    // Keep only recent history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
    
    return health;
  }

  /**
   * Get health history for trend analysis
   */
  getHealthHistory() {
    return this.healthHistory;
  }

  /**
   * Check for data loss patterns
   */
  analyzeDataLoss() {
    const recent = this.healthHistory.slice(-10); // Last 10 checks
    
    if (recent.length < 2) return { hasDataLoss: false, message: 'Insufficient data' };
    
    // Check for sudden drops in prescription count
    const prescriptionCounts = recent.map(h => h.health.metrics.prescriptionCount);
    const maxCount = Math.max(...prescriptionCounts);
    const minCount = Math.min(...prescriptionCounts);
    const currentCount = prescriptionCounts[prescriptionCounts.length - 1];
    
    // If we lost more than 50% of data, flag as potential data loss
    if (maxCount > 0 && currentCount < maxCount * 0.5) {
      return {
        hasDataLoss: true,
        message: `Potential data loss detected: ${maxCount} → ${currentCount} prescriptions`,
        severity: 'high'
      };
    }
    
    // If we lost any data, flag as minor loss
    if (maxCount > currentCount) {
      return {
        hasDataLoss: true,
        message: `Minor data loss detected: ${maxCount} → ${currentCount} prescriptions`,
        severity: 'low'
      };
    }
    
    return { hasDataLoss: false, message: 'No data loss detected' };
  }

  /**
   * Get database statistics summary
   */
  async getDatabaseStats() {
    const health = await this.getCurrentHealth();
    const dataLoss = this.analyzeDataLoss();
    
    return {
      current: health,
      dataLoss,
      history: {
        totalChecks: this.healthHistory.length,
        lastCheck: this.healthHistory[this.healthHistory.length - 1]?.timestamp,
        averagePrescriptions: this.calculateAverage('prescriptionCount'),
        averageExtractionResults: this.calculateAverage('extractionResultCount')
      }
    };
  }

  /**
   * Calculate average for a metric
   */
  private calculateAverage(metric: string): number {
    if (this.healthHistory.length === 0) return 0;
    
    const sum = this.healthHistory.reduce((acc, h) => {
      return acc + (h.health.metrics[metric] || 0);
    }, 0);
    
    return Math.round(sum / this.healthHistory.length);
  }

  /**
   * Log detailed database report
   */
  async logDetailedReport() {
    const stats = await this.getDatabaseStats();
    
    log('📊 === DATABASE HEALTH REPORT ===');
    log(`Status: ${stats.current.status} - ${stats.current.message}`);
    log(`Prescriptions: ${stats.current.metrics.prescriptionCount}`);
    log(`Extraction Results: ${stats.current.metrics.extractionResultCount}`);
    log(`Database Size: ${stats.current.metrics.databaseSize}`);
    log(`Connections: ${stats.current.metrics.totalConnections}/10`);
    log(`Last Activity: ${stats.current.metrics.lastActivity.toISOString()}`);
    log(`DB Uptime: ${stats.current.metrics.uptime}`);
    
    if (stats.dataLoss.hasDataLoss) {
      log(`🚨 DATA LOSS ALERT: ${stats.dataLoss.message}`);
    }
    
    log(`History: ${stats.history.totalChecks} checks, avg ${stats.history.averagePrescriptions} prescriptions`);
    log('================================');
  }
}

export const dbHealthService = DatabaseHealthService.getInstance();
