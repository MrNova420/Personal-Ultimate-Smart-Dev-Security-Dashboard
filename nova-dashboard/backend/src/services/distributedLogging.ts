/**
 * NovaShield 2025 Distributed Logging and Monitoring System
 * 
 * Enterprise-grade distributed logging with:
 * - Centralized log aggregation across all microservices
 * - Real-time log streaming and analysis
 * - Structured logging with correlation IDs
 * - Performance monitoring and metrics collection
 * - Alert generation and notification system
 * - Log retention and archival policies
 * - Security event correlation and forensics
 * - Distributed tracing and observability
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { auditLogger } from '../security/auditLogger';
import { messageQueue, MessageTypes } from '../messaging/messageQueue';
import { healthCheckService } from '../services/healthCheck';

// Log levels and types
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogCategory = 'application' | 'security' | 'performance' | 'audit' | 'system' | 'user';
export type ServiceName = 'backend' | 'security-engine' | 'terminal-service' | 'monitoring-service' | 'frontend';

// Structured log entry
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  service: ServiceName;
  message: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  metadata: Record<string, any>;
  tags: string[];
  environment: string;
  version: string;
}

// Performance metric entry
export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  service: ServiceName;
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  unit: string;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

// Alert rule configuration
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  timeWindow: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number;
  actions: AlertAction[];
}

// Alert action configuration
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'message_queue';
  target: string;
  template: string;
  enabled: boolean;
}

// Log query interface
export interface LogQuery {
  startTime?: Date;
  endTime?: Date;
  levels?: LogLevel[];
  categories?: LogCategory[];
  services?: ServiceName[];
  correlationId?: string;
  traceId?: string;
  userId?: string;
  text?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'level' | 'service';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Distributed Logging and Monitoring Manager
 */
export class DistributedLoggingService extends EventEmitter {
  private logs: Map<string, LogEntry> = new Map();
  private metrics: Map<string, PerformanceMetric> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private logStreams: Map<string, NodeJS.Timeout> = new Map();
  private correlationMap: Map<string, string[]> = new Map();
  private isRunning: boolean = false;
  
  // Configuration
  private readonly config = {
    maxLogEntries: 100000,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    compressionEnabled: true,
    encryptionEnabled: true,
    replicationEnabled: true,
    alertCooldown: 300000, // 5 minutes
    metricsInterval: 60000, // 1 minute
  };

  constructor() {
    super();
    this.initializeAlertRules();
    this.startPeriodicTasks();
    logger.info('📊 Distributed Logging and Monitoring Service initialized');
  }

  /**
   * Initialize default alert rules
   */
  private initializeAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        condition: 'error_rate > threshold',
        threshold: 0.05, // 5%
        timeWindow: 300000, // 5 minutes
        severity: 'high',
        enabled: true,
        cooldown: 600000, // 10 minutes
        actions: [
          {
            type: 'message_queue',
            target: 'system',
            template: 'high_error_rate_alert',
            enabled: true
          }
        ]
      },
      {
        id: 'service_unavailable',
        name: 'Service Unavailable',
        description: 'Alert when service health check fails',
        condition: 'service_status = unhealthy',
        threshold: 1,
        timeWindow: 60000, // 1 minute
        severity: 'critical',
        enabled: true,
        cooldown: 300000, // 5 minutes
        actions: [
          {
            type: 'message_queue',
            target: 'system',
            template: 'service_unavailable_alert',
            enabled: true
          }
        ]
      },
      {
        id: 'high_response_time',
        name: 'High Response Time',
        description: 'Alert when response time exceeds threshold',
        condition: 'avg_response_time > threshold',
        threshold: 2000, // 2 seconds
        timeWindow: 600000, // 10 minutes
        severity: 'medium',
        enabled: true,
        cooldown: 900000, // 15 minutes
        actions: [
          {
            type: 'message_queue',
            target: 'monitoring',
            template: 'high_response_time_alert',
            enabled: true
          }
        ]
      },
      {
        id: 'security_incident',
        name: 'Security Incident',
        description: 'Alert on security-related events',
        condition: 'category = security AND level IN (error, fatal)',
        threshold: 1,
        timeWindow: 60000, // 1 minute
        severity: 'critical',
        enabled: true,
        cooldown: 0, // No cooldown for security events
        actions: [
          {
            type: 'message_queue',
            target: 'security',
            template: 'security_incident_alert',
            enabled: true
          }
        ]
      },
      {
        id: 'resource_exhaustion',
        name: 'Resource Exhaustion',
        description: 'Alert when system resources are low',
        condition: 'memory_usage > 0.9 OR cpu_usage > 0.8',
        threshold: 1,
        timeWindow: 180000, // 3 minutes
        severity: 'high',
        enabled: true,
        cooldown: 1800000, // 30 minutes
        actions: [
          {
            type: 'message_queue',
            target: 'system',
            template: 'resource_exhaustion_alert',
            enabled: true
          }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    logger.info('🚨 Default alert rules initialized', {
      rulesCount: defaultRules.length,
      enabled: defaultRules.filter(r => r.enabled).length
    });
  }

  /**
   * Log a structured entry
   */
  async logEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      ...entry,
      environment: entry.environment || process.env.NODE_ENV || 'development',
      version: entry.version || '1.0.0'
    };

    // Store log entry
    this.logs.set(logEntry.id, logEntry);

    // Update correlation mapping
    if (logEntry.correlationId) {
      const correlated = this.correlationMap.get(logEntry.correlationId) || [];
      correlated.push(logEntry.id);
      this.correlationMap.set(logEntry.correlationId, correlated);
    }

    // Check alert rules
    await this.checkAlertRules(logEntry);

    // Emit log event for real-time streaming
    this.emit('logEntry', logEntry);

    // Audit log for security-related entries
    if (logEntry.category === 'security' || logEntry.level === 'error' || logEntry.level === 'fatal') {
      await auditLogger.logSecurityEvent(
        'system',
        logEntry.level === 'fatal' ? 'critical' : 'medium',
        'distributed_log_entry',
        {
          logId: logEntry.id,
          service: logEntry.service,
          category: logEntry.category,
          level: logEntry.level,
          message: logEntry.message
        },
        {
          userId: logEntry.userId,
          sessionId: logEntry.sessionId,
          ipAddress: logEntry.ipAddress || '127.0.0.1',
          userAgent: logEntry.userAgent,
          outcome: logEntry.level === 'error' || logEntry.level === 'fatal' ? 'failure' : 'success'
        }
      );
    }

    return logEntry.id;
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<string> {
    const perfMetric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date(),
      ...metric
    };

    this.metrics.set(perfMetric.id, perfMetric);

    // Check metric-based alert rules
    await this.checkMetricAlerts(perfMetric);

    // Emit metric event
    this.emit('metric', perfMetric);

    return perfMetric.id;
  }

  /**
   * Query logs with filtering and pagination
   */
  async queryLogs(query: LogQuery): Promise<{
    logs: LogEntry[];
    totalCount: number;
    hasMore: boolean;
  }> {
    let filteredLogs = Array.from(this.logs.values());

    // Apply filters
    if (query.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endTime!);
    }
    if (query.levels && query.levels.length > 0) {
      filteredLogs = filteredLogs.filter(log => query.levels!.includes(log.level));
    }
    if (query.categories && query.categories.length > 0) {
      filteredLogs = filteredLogs.filter(log => query.categories!.includes(log.category));
    }
    if (query.services && query.services.length > 0) {
      filteredLogs = filteredLogs.filter(log => query.services!.includes(log.service));
    }
    if (query.correlationId) {
      filteredLogs = filteredLogs.filter(log => log.correlationId === query.correlationId);
    }
    if (query.traceId) {
      filteredLogs = filteredLogs.filter(log => log.traceId === query.traceId);
    }
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }
    if (query.text) {
      const searchText = query.text.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchText) ||
        log.tags.some(tag => tag.toLowerCase().includes(searchText))
      );
    }
    if (query.tags && query.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        query.tags!.some(tag => log.tags.includes(tag))
      );
    }

    // Sort logs
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    filteredLogs.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'level':
          comparison = this.compareLevels(a.level, b.level);
          break;
        case 'service':
          comparison = a.service.localeCompare(b.service);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const totalCount = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    // Log query event
    await auditLogger.logSecurityEvent(
      'system',
      'low',
      'log_query_executed',
      {
        query,
        resultsCount: paginatedLogs.length,
        totalCount
      },
      {
        ipAddress: '127.0.0.1',
        outcome: 'success'
      }
    );

    return {
      logs: paginatedLogs,
      totalCount,
      hasMore
    };
  }

  /**
   * Get logs by correlation ID
   */
  async getCorrelatedLogs(correlationId: string): Promise<LogEntry[]> {
    const logIds = this.correlationMap.get(correlationId) || [];
    const correlatedLogs = logIds
      .map(id => this.logs.get(id))
      .filter(log => log !== undefined) as LogEntry[];

    correlatedLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return correlatedLogs;
  }

  /**
   * Get performance metrics
   */
  async getMetrics(
    service?: ServiceName,
    metricName?: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<PerformanceMetric[]> {
    let filteredMetrics = Array.from(this.metrics.values());

    if (service) {
      filteredMetrics = filteredMetrics.filter(m => m.service === service);
    }
    if (metricName) {
      filteredMetrics = filteredMetrics.filter(m => m.metricName === metricName);
    }
    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }
    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    return filteredMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    totalLogs: number;
    totalMetrics: number;
    logsByLevel: Record<LogLevel, number>;
    logsByService: Record<ServiceName, number>;
    logsByCategory: Record<LogCategory, number>;
    alertRulesCount: number;
    activeAlerts: number;
    recentErrors: number;
    avgResponseTime: number;
    systemHealth: string;
  }> {
    const logs = Array.from(this.logs.values());
    const metrics = Array.from(this.metrics.values());
    const systemHealth = healthCheckService.getSystemHealth();

    // Calculate log statistics
    const logsByLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    const logsByService = logs.reduce((acc, log) => {
      acc[log.service] = (acc[log.service] || 0) + 1;
      return acc;
    }, {} as Record<ServiceName, number>);

    const logsByCategory = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<LogCategory, number>);

    // Calculate recent errors (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = logs.filter(log => 
      log.timestamp >= last24Hours && 
      (log.level === 'error' || log.level === 'fatal')
    ).length;

    // Calculate average response time from performance metrics
    const responseTimeMetrics = metrics.filter(m => m.metricName === 'response_time');
    const avgResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    return {
      totalLogs: logs.length,
      totalMetrics: metrics.length,
      logsByLevel,
      logsByService,
      logsByCategory,
      alertRulesCount: this.alertRules.size,
      activeAlerts: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
      recentErrors,
      avgResponseTime,
      systemHealth: systemHealth.status
    };
  }

  /**
   * Check alert rules against log entry
   */
  private async checkAlertRules(logEntry: LogEntry): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateAlertCondition(rule, logEntry);
        
        if (shouldAlert) {
          await this.triggerAlert(rule, logEntry);
        }
      } catch (error) {
        logger.error('🚨 Alert rule evaluation failed', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Check metric-based alert rules
   */
  private async checkMetricAlerts(metric: PerformanceMetric): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      if (!rule.condition.includes('metric')) continue;

      try {
        const shouldAlert = await this.evaluateMetricAlertCondition(rule, metric);
        
        if (shouldAlert) {
          await this.triggerMetricAlert(rule, metric);
        }
      } catch (error) {
        logger.error('🚨 Metric alert rule evaluation failed', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Evaluate alert condition (simplified implementation)
   */
  private async evaluateAlertCondition(rule: AlertRule, logEntry: LogEntry): Promise<boolean> {
    // Simplified rule evaluation - in production would use proper expression evaluator
    if (rule.condition.includes('category = security') && logEntry.category === 'security') {
      if (rule.condition.includes('level IN (error, fatal)')) {
        return logEntry.level === 'error' || logEntry.level === 'fatal';
      }
    }

    if (rule.condition.includes('error_rate > threshold')) {
      const recentLogs = Array.from(this.logs.values()).filter(
        log => log.timestamp >= new Date(Date.now() - rule.timeWindow)
      );
      const errorCount = recentLogs.filter(log => log.level === 'error' || log.level === 'fatal').length;
      const errorRate = recentLogs.length > 0 ? errorCount / recentLogs.length : 0;
      return errorRate > rule.threshold;
    }

    return false;
  }

  /**
   * Evaluate metric alert condition
   */
  private async evaluateMetricAlertCondition(rule: AlertRule, metric: PerformanceMetric): Promise<boolean> {
    if (rule.condition.includes('avg_response_time > threshold') && metric.metricName === 'response_time') {
      return metric.value > rule.threshold;
    }

    if (rule.condition.includes('memory_usage > 0.9') && metric.metricName === 'memory_usage') {
      return metric.value > 0.9;
    }

    if (rule.condition.includes('cpu_usage > 0.8') && metric.metricName === 'cpu_usage') {
      return metric.value > 0.8;
    }

    return false;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, logEntry: LogEntry): Promise<void> {
    const alertPayload = {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert triggered: ${rule.description}`,
      logEntry: {
        id: logEntry.id,
        service: logEntry.service,
        level: logEntry.level,
        category: logEntry.category,
        message: logEntry.message,
        timestamp: logEntry.timestamp
      },
      timestamp: new Date().toISOString()
    };

    // Execute alert actions
    for (const action of rule.actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAlertAction(action, alertPayload);
      } catch (error) {
        logger.error('🚨 Alert action execution failed', {
          ruleId: rule.id,
          actionType: action.type,
          error: error.message
        });
      }
    }

    logger.warn('🚨 Alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      logEntryId: logEntry.id
    });

    this.emit('alert', { rule, logEntry, payload: alertPayload });
  }

  /**
   * Trigger a metric alert
   */
  private async triggerMetricAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    const alertPayload = {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Metric alert triggered: ${rule.description}`,
      metric: {
        id: metric.id,
        service: metric.service,
        metricName: metric.metricName,
        value: metric.value,
        unit: metric.unit,
        timestamp: metric.timestamp
      },
      timestamp: new Date().toISOString()
    };

    // Execute alert actions
    for (const action of rule.actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAlertAction(action, alertPayload);
      } catch (error) {
        logger.error('🚨 Metric alert action execution failed', {
          ruleId: rule.id,
          actionType: action.type,
          error: error.message
        });
      }
    }

    logger.warn('🚨 Metric alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metricId: metric.id
    });

    this.emit('metricAlert', { rule, metric, payload: alertPayload });
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(action: AlertAction, payload: any): Promise<void> {
    switch (action.type) {
      case 'message_queue':
        await messageQueue.publishMessage(action.target, {
          type: MessageTypes.MONITORING_ALERT_TRIGGERED,
          payload,
          source: 'distributed-logging-service',
          priority: payload.severity === 'critical' ? 'critical' : 'high',
          maxRetries: 3
        });
        break;
        
      case 'webhook':
        // In production, would make HTTP request to webhook URL
        logger.info('🔗 Webhook alert action', { target: action.target, payload });
        break;
        
      case 'email':
        // In production, would send email
        logger.info('📧 Email alert action', { target: action.target, payload });
        break;
        
      case 'slack':
        // In production, would send Slack message
        logger.info('💬 Slack alert action', { target: action.target, payload });
        break;
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
    // Log cleanup task
    setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000); // Every hour

    // Metrics cleanup task
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Every hour

    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metricsInterval);

    logger.info('⏰ Periodic maintenance tasks started');
  }

  /**
   * Clean up old log entries
   */
  private cleanupOldLogs(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    let cleanedCount = 0;

    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoffTime) {
        this.logs.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('🧹 Cleaned up old log entries', { cleanedCount });
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    let cleanedCount = 0;

    for (const [id, metric] of this.metrics.entries()) {
      if (metric.timestamp < cutoffTime) {
        this.metrics.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('🧹 Cleaned up old metrics', { cleanedCount });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      await this.recordMetric({
        service: 'backend',
        metricName: 'memory_usage',
        metricType: 'gauge',
        value: memUsage.heapUsed / memUsage.heapTotal,
        unit: 'ratio',
        tags: { type: 'heap' },
        metadata: { memUsage }
      });

      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage();
      await this.recordMetric({
        service: 'backend',
        metricName: 'cpu_usage',
        metricType: 'gauge',
        value: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        unit: 'seconds',
        tags: { type: 'total' },
        metadata: { cpuUsage }
      });

      // Process uptime
      await this.recordMetric({
        service: 'backend',
        metricName: 'uptime',
        metricType: 'gauge',
        value: process.uptime(),
        unit: 'seconds',
        tags: { type: 'process' },
        metadata: {}
      });

      // Log statistics
      const stats = await this.getSystemStats();
      await this.recordMetric({
        service: 'backend',
        metricName: 'total_logs',
        metricType: 'gauge',
        value: stats.totalLogs,
        unit: 'count',
        tags: { type: 'logs' },
        metadata: { stats }
      });

    } catch (error) {
      logger.error('📊 System metrics collection failed', error);
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compare log levels for sorting
   */
  private compareLevels(a: LogLevel, b: LogLevel): number {
    const levels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
    return levels[a] - levels[b];
  }

  /**
   * Start the distributed logging service
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('🚀 Distributed Logging and Monitoring Service started');
    this.emit('started');
  }

  /**
   * Stop the distributed logging service
   */
  stop(): void {
    if (!this.isRunning) return;

    // Clear all intervals
    this.logStreams.forEach(interval => clearInterval(interval));
    this.logStreams.clear();
    
    this.isRunning = false;
    logger.info('🛑 Distributed Logging and Monitoring Service stopped');
    this.emit('stopped');
  }
}

// Create singleton instance
export const distributedLoggingService = new DistributedLoggingService();

export default distributedLoggingService;
