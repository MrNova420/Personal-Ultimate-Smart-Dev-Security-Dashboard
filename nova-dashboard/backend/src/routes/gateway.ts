/**
 * NovaShield API Gateway Routes
 * 
 * Handles routing between microservices with security and monitoring
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { apiGateway, createServiceRateLimit, gatewayMiddleware } from '@/middleware/apiGateway';
import { auditLogger } from '@/security/auditLogger';

const router = Router();

/**
 * Gateway status endpoint
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const status = apiGateway.getServicesStatus();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'gateway_status_accessed',
    { servicesCount: status.totalServices },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    gateway: 'NovaShield API Gateway',
    version: '1.0.0',
    status: 'operational',
    ...status
  });
}));

/**
 * Security Engine routes (with enhanced rate limiting)
 */
router.use('/security-engine*', 
  createServiceRateLimit('security-engine'),
  (req: Request, res: Response, next) => {
    // Remove the gateway prefix from the path
    req.path = req.path.replace('/security-engine', '');
    req.url = req.url.replace('/security-engine', '');
    next();
  },
  gatewayMiddleware('security-engine')
);

/**
 * Terminal Service routes (with terminal-specific rate limiting)
 */
router.use('/terminal*',
  createServiceRateLimit('terminal-service'),
  (req: Request, res: Response, next) => {
    // Remove the gateway prefix from the path
    req.path = req.path.replace('/terminal', '');
    req.url = req.url.replace('/terminal', '');
    next();
  },
  gatewayMiddleware('terminal-service')
);

/**
 * Monitoring Service routes (with monitoring-specific rate limiting)
 */
router.use('/monitoring*',
  createServiceRateLimit('monitoring-service'),
  (req: Request, res: Response, next) => {
    // Remove the gateway prefix from the path
    req.path = req.path.replace('/monitoring', '');
    req.url = req.url.replace('/monitoring', '');
    next();
  },
  gatewayMiddleware('monitoring-service')
);

/**
 * Health check aggregator - checks all services
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const status = apiGateway.getServicesStatus();
  const isHealthy = status.healthyServices === status.totalServices;
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'gateway_health_check',
    {
      totalServices: status.totalServices,
      healthyServices: status.healthyServices,
      isHealthy
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: isHealthy ? 'success' : 'failure'
    }
  );

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    gateway: 'novashield-api-gateway',
    timestamp: new Date().toISOString(),
    services: status.services.map(service => ({
      name: service.name,
      healthy: service.isHealthy,
      lastCheck: service.lastHealthCheck,
      responseTime: service.avgResponseTime
    }))
  });
}));

/**
 * Gateway metrics endpoint
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const status = apiGateway.getServicesStatus();
  
  const metrics = {
    gateway: {
      name: 'novashield-api-gateway',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    services: status.services,
    aggregated: {
      totalRequests: status.services.reduce((sum, s) => sum + s.requestCount, 0),
      totalErrors: status.services.reduce((sum, s) => sum + s.errorCount, 0),
      averageResponseTime: status.services.reduce((sum, s) => sum + s.avgResponseTime, 0) / status.services.length,
      successRate: (() => {
        const totalRequests = status.services.reduce((sum, s) => sum + s.requestCount, 0);
        const totalErrors = status.services.reduce((sum, s) => sum + s.errorCount, 0);
        return totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100).toFixed(2) : '100.00';
      })()
    },
    timestamp: new Date().toISOString()
  };

  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'gateway_metrics_accessed',
    { totalRequests: metrics.aggregated.totalRequests },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json(metrics);
}));

/**
 * Service discovery endpoint
 */
router.get('/services', asyncHandler(async (req: Request, res: Response) => {
  const status = apiGateway.getServicesStatus();
  
  const serviceDiscovery = {
    services: status.services.map(service => ({
      name: service.name,
      url: service.url,
      healthy: service.isHealthy,
      endpoints: getServiceEndpoints(service.name),
      lastHealthCheck: service.lastHealthCheck,
      circuitBreakerState: service.circuitBreakerState
    })),
    lastUpdated: new Date().toISOString()
  };

  await auditLogger.logSecurityEvent(
    'system',
    'medium',
    'service_discovery_accessed',
    { servicesCount: serviceDiscovery.services.length },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json(serviceDiscovery);
}));

/**
 * Get available endpoints for each service
 */
function getServiceEndpoints(serviceName: string): string[] {
  const endpoints = {
    'security-engine': [
      '/',
      '/health',
      '/api/alerts',
      '/api/scans',
      '/api/threats',
      '/api/metrics'
    ],
    'terminal-service': [
      '/',
      '/health',
      '/api/sessions',
      '/api/metrics'
    ],
    'monitoring-service': [
      '/',
      '/health',
      '/api/metrics',
      '/api/alerts',
      '/api/status'
    ]
  };

  return endpoints[serviceName] || [];
}

export default router;