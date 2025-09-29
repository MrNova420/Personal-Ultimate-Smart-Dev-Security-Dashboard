/**
 * NovaShield Distributed Logging and Monitoring Routes
 * 
 * Provides comprehensive logging and monitoring endpoints for enterprise observability
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  distributedLoggingService, 
  LogQuery, 
  LogLevel, 
  LogCategory, 
  ServiceName 
} from '../services/distributedLogging';
import { auditLogger } from '../security/auditLogger';

const router = Router();

/**
 * System logging and monitoring overview
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const stats = await distributedLoggingService.getSystemStats();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'logging_overview_accessed',
    { 
      totalLogs: stats.totalLogs,
      totalMetrics: stats.totalMetrics,
      systemHealth: stats.systemHealth
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    system: 'NovaShield 2025 Distributed Logging & Monitoring',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ...stats,
    features: {
      structuredLogging: true,
      realTimeMonitoring: true,
      distributedTracing: true,
      alerting: true,
      metricsCollection: true,
      logAggregation: true,
      performanceMonitoring: true,
      securityEventCorrelation: true
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Query logs with filtering and pagination
 */
router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const query: LogQuery = {
    startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
    endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
    levels: req.query.levels ? (req.query.levels as string).split(',') as LogLevel[] : undefined,
    categories: req.query.categories ? (req.query.categories as string).split(',') as LogCategory[] : undefined,
    services: req.query.services ? (req.query.services as string).split(',') as ServiceName[] : undefined,
    correlationId: req.query.correlationId as string,
    traceId: req.query.traceId as string,
    userId: req.query.userId as string,
    text: req.query.text as string,
    tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    sortBy: req.query.sortBy as 'timestamp' | 'level' | 'service',
    sortOrder: req.query.sortOrder as 'asc' | 'desc'
  };

  const result = await distributedLoggingService.queryLogs(query);
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'logs_queried',
    { 
      query: {
        ...query,
        startTime: query.startTime?.toISOString(),
        endTime: query.endTime?.toISOString()
      },
      resultsCount: result.logs.length,
      totalCount: result.totalCount
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    success: true,
    query: {
      ...query,
      startTime: query.startTime?.toISOString(),
      endTime: query.endTime?.toISOString()
    },
    result: {
      logs: result.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      })),
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      returnedCount: result.logs.length
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get logs by correlation ID (distributed tracing)
 */
router.get('/logs/trace/:correlationId', asyncHandler(async (req: Request, res: Response) => {
  const { correlationId } = req.params;
  
  if (!correlationId) {
    return res.status(400).json({
      error: 'Correlation ID is required',
      correlationId
    });
  }

  const correlatedLogs = await distributedLoggingService.getCorrelatedLogs(correlationId);
  
  await auditLogger.logSecurityEvent(
    'system',
    'medium',
    'correlated_logs_accessed',
    { 
      correlationId,
      logsCount: correlatedLogs.length
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    success: true,
    correlationId,
    logs: correlatedLogs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString()
    })),
    totalCount: correlatedLogs.length,
    traceInfo: {
      startTime: correlatedLogs.length > 0 ? correlatedLogs[0].timestamp.toISOString() : null,
      endTime: correlatedLogs.length > 0 ? correlatedLogs[correlatedLogs.length - 1].timestamp.toISOString() : null,
      duration: correlatedLogs.length > 1 
        ? correlatedLogs[correlatedLogs.length - 1].timestamp.getTime() - correlatedLogs[0].timestamp.getTime()
        : 0,
      services: [...new Set(correlatedLogs.map(log => log.service))],
      levels: [...new Set(correlatedLogs.map(log => log.level))]
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Submit a new log entry
 */
router.post('/logs', asyncHandler(async (req: Request, res: Response) => {
  const {
    level,
    category,
    service,
    message,
    correlationId,
    traceId,
    spanId,
    metadata,
    tags
  } = req.body;

  if (!level || !category || !service || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['level', 'category', 'service', 'message'],
      provided: Object.keys(req.body)
    });
  }

  const logId = await distributedLoggingService.logEntry({
    level,
    category,
    service,
    message,
    correlationId,
    traceId,
    spanId,
    userId: req.user?.id,
    sessionId: req.sessionID,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
    metadata: metadata || {},
    tags: tags || [],
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });

  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'log_entry_submitted',
    { 
      logId,
      level,
      category,
      service,
      correlationId
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.status(201).json({
    success: true,
    logId,
    message: 'Log entry created successfully',
    entry: {
      id: logId,
      level,
      category,
      service,
      message,
      correlationId,
      traceId,
      spanId
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get performance metrics
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const service = req.query.service as ServiceName;
  const metricName = req.query.metricName as string;
  const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
  const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;

  const metrics = await distributedLoggingService.getMetrics(service, metricName, startTime, endTime);
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'metrics_accessed',
    { 
      service,
      metricName,
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      metricsCount: metrics.length
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    success: true,
    filters: {
      service,
      metricName,
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString()
    },
    metrics: metrics.map(metric => ({
      ...metric,
      timestamp: metric.timestamp.toISOString()
    })),
    totalCount: metrics.length,
    summary: {
      services: [...new Set(metrics.map(m => m.service))],
      metricNames: [...new Set(metrics.map(m => m.metricName))],
      metricTypes: [...new Set(metrics.map(m => m.metricType))]
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Submit a new performance metric
 */
router.post('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const {
    service,
    metricName,
    metricType,
    value,
    unit,
    tags,
    metadata
  } = req.body;

  if (!service || !metricName || !metricType || value === undefined || !unit) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['service', 'metricName', 'metricType', 'value', 'unit'],
      provided: Object.keys(req.body)
    });
  }

  const metricId = await distributedLoggingService.recordMetric({
    service,
    metricName,
    metricType,
    value,
    unit,
    tags: tags || {},
    metadata: metadata || {}
  });

  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'metric_submitted',
    { 
      metricId,
      service,
      metricName,
      metricType,
      value,
      unit
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.status(201).json({
    success: true,
    metricId,
    message: 'Metric recorded successfully',
    metric: {
      id: metricId,
      service,
      metricName,
      metricType,
      value,
      unit,
      tags,
      metadata
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get system statistics and dashboard data
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await distributedLoggingService.getSystemStats();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'logging_stats_accessed',
    { 
      totalLogs: stats.totalLogs,
      totalMetrics: stats.totalMetrics,
      systemHealth: stats.systemHealth
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    success: true,
    statistics: stats,
    dashboard: {
      healthScore: stats.systemHealth === 'healthy' ? 100 : 
                  stats.systemHealth === 'degraded' ? 75 : 
                  stats.systemHealth === 'unhealthy' ? 25 : 0,
      errorRate: stats.totalLogs > 0 
        ? ((stats.logsByLevel.error || 0) + (stats.logsByLevel.fatal || 0)) / stats.totalLogs * 100
        : 0,
      alertStatus: stats.activeAlerts > 0 ? 'active' : 'normal',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastUpdate: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Real-time log streaming endpoint (Server-Sent Events)
 */
router.get('/stream', asyncHandler(async (req: Request, res: Response) => {
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': req.get('Origin') || '*',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to NovaShield log stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Set up log streaming
  const logHandler = (logEntry: any) => {
    res.write(`data: ${JSON.stringify({
      type: 'log',
      data: {
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString()
      }
    })}\n\n`);
  };

  const alertHandler = (alertData: any) => {
    res.write(`data: ${JSON.stringify({
      type: 'alert',
      data: alertData
    })}\n\n`);
  };

  const metricHandler = (metric: any) => {
    res.write(`data: ${JSON.stringify({
      type: 'metric',
      data: {
        ...metric,
        timestamp: metric.timestamp.toISOString()
      }
    })}\n\n`);
  };

  // Subscribe to events
  distributedLoggingService.on('logEntry', logHandler);
  distributedLoggingService.on('alert', alertHandler);
  distributedLoggingService.on('metric', metricHandler);

  // Log stream access
  await auditLogger.logSecurityEvent(
    'system',
    'medium',
    'log_stream_accessed',
    { 
      streamType: 'server_sent_events',
      clientIP: req.ip
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  // Handle client disconnect
  req.on('close', () => {
    distributedLoggingService.off('logEntry', logHandler);
    distributedLoggingService.off('alert', alertHandler);
    distributedLoggingService.off('metric', metricHandler);
    res.end();
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}));

/**
 * Export logs (CSV/JSON format)
 */
router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format as 'json' | 'csv' || 'json';
  const query: LogQuery = {
    startTime: req.query.startTime ? new Date(req.query.startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: req.query.endTime ? new Date(req.query.endTime as string) : new Date(),
    levels: req.query.levels ? (req.query.levels as string).split(',') as LogLevel[] : undefined,
    services: req.query.services ? (req.query.services as string).split(',') as ServiceName[] : undefined,
    limit: 10000 // Max export limit
  };

  const result = await distributedLoggingService.queryLogs(query);
  
  await auditLogger.logSecurityEvent(
    'system',
    'medium',
    'logs_exported',
    { 
      format,
      exportedCount: result.logs.length,
      query: {
        ...query,
        startTime: query.startTime?.toISOString(),
        endTime: query.endTime?.toISOString()
      }
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  const filename = `novashield_logs_${Date.now()}.${format}`;
  
  if (format === 'csv') {
    // Convert to CSV
    const headers = ['timestamp', 'level', 'category', 'service', 'message', 'correlationId', 'userId', 'ipAddress'];
    const csvRows = [
      headers.join(','),
      ...result.logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.category,
        log.service,
        `"${log.message.replace(/"/g, '""')}"`,
        log.correlationId || '',
        log.userId || '',
        log.ipAddress || ''
      ].join(','))
    ];
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvRows.join('\n'));
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      export: {
        format,
        timestamp: new Date().toISOString(),
        query: {
          ...query,
          startTime: query.startTime?.toISOString(),
          endTime: query.endTime?.toISOString()
        },
        totalCount: result.totalCount,
        exportedCount: result.logs.length
      },
      logs: result.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))
    });
  }
}));

export default router;
