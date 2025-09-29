/**
 * NovaShield Health Check and Service Discovery Routes
 * 
 * Provides comprehensive health monitoring and service discovery endpoints
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { healthCheckService, HealthStatus } from '../services/healthCheck';
import { auditLogger } from '../security/auditLogger';

const router = Router();

/**
 * System health overview
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const systemHealth = healthCheckService.getSystemHealth();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'system_health_accessed',
    { 
      status: systemHealth.status,
      totalServices: systemHealth.totalServices,
      healthyServices: systemHealth.healthyServices
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
    system: 'NovaShield 2025 Enterprise Security Platform',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ...systemHealth,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));

/**
 * Detailed services health status
 */
router.get('/services', asyncHandler(async (req: Request, res: Response) => {
  const services = healthCheckService.getServicesHealth();
  const systemHealth = healthCheckService.getSystemHealth();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'services_health_accessed',
    { servicesCount: services.length },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    systemStatus: systemHealth.status,
    totalServices: services.length,
    services: services.map(service => ({
      id: service.id,
      name: service.name,
      type: service.type,
      status: service.status,
      url: service.url,
      version: service.version,
      lastCheck: service.lastCheck,
      uptime: service.uptime,
      responseTime: service.responseTime,
      errorCount: service.errorCount,
      successCount: service.successCount,
      successRate: service.successCount > 0 
        ? ((service.successCount / (service.successCount + service.errorCount)) * 100).toFixed(2)
        : '0.00',
      dependencies: service.dependencies,
      lastChecks: service.checks.slice(-3) // Last 3 checks
    })),
    timestamp: new Date().toISOString()
  });
}));

/**
 * Individual service health details
 */
router.get('/services/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const services = healthCheckService.getServicesHealth();
  const service = services.find(s => s.id === serviceId);

  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      serviceId,
      availableServices: services.map(s => ({ id: s.id, name: s.name }))
    });
  }

  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'service_health_accessed',
    { 
      serviceId,
      serviceName: service.name,
      status: service.status
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
    service: {
      ...service,
      successRate: service.successCount > 0 
        ? ((service.successCount / (service.successCount + service.errorCount)) * 100).toFixed(2)
        : '0.00',
      healthHistory: service.checks.slice(-10) // Last 10 checks
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Service registry and discovery
 */
router.get('/registry', asyncHandler(async (req: Request, res: Response) => {
  const registry = healthCheckService.getServiceRegistry();
  const services = healthCheckService.getServicesHealth();
  
  await auditLogger.logSecurityEvent(
    'system',
    'medium',
    'service_registry_accessed',
    { registeredServices: registry.length },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  const enrichedRegistry = registry.map(entry => {
    const health = services.find(s => s.id === entry.id);
    return {
      ...entry,
      currentHealth: health ? {
        status: health.status,
        lastCheck: health.lastCheck,
        responseTime: health.responseTime,
        uptime: health.uptime
      } : null
    };
  });

  res.json({
    registry: enrichedRegistry,
    totalServices: registry.length,
    serviceTypes: {
      core: registry.filter(s => s.type === 'core').length,
      microservice: registry.filter(s => s.type === 'microservice').length,
      database: registry.filter(s => s.type === 'database').length,
      cache: registry.filter(s => s.type === 'cache').length,
      external: registry.filter(s => s.type === 'external').length
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Trigger manual health check for a service
 */
router.post('/check/:serviceId', asyncHandler(async (req: Request, res: Response) => {
  const { serviceId } = req.params;
  const services = healthCheckService.getServicesHealth();
  const service = services.find(s => s.id === serviceId);

  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      serviceId
    });
  }

  try {
    const checkResults = await healthCheckService.performHealthCheck(serviceId);
    
    await auditLogger.logSecurityEvent(
      'system',
      'medium',
      'manual_health_check_triggered',
      { 
        serviceId,
        serviceName: service.name,
        checksPerformed: checkResults.length
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
      serviceId,
      serviceName: service.name,
      checkResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'system',
      'high',
      'manual_health_check_failed',
      { 
        serviceId,
        error: error.message
      },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );

    res.status(500).json({
      success: false,
      error: 'Health check failed',
      serviceId,
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * System readiness check (for load balancers)
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  const systemHealth = healthCheckService.getSystemHealth();
  const isReady = systemHealth.status === 'healthy' || systemHealth.status === 'degraded';
  
  if (isReady) {
    res.json({
      ready: true,
      status: systemHealth.status,
      message: 'System is ready to accept traffic',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      ready: false,
      status: systemHealth.status,
      message: 'System is not ready to accept traffic',
      healthyServices: systemHealth.healthyServices,
      totalServices: systemHealth.totalServices,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * System liveness check (for container orchestration)
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  // Basic liveness check - if we can respond, we're alive
  res.json({
    alive: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
}));

/**
 * Health check statistics and metrics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const services = healthCheckService.getServicesHealth();
  const systemHealth = healthCheckService.getSystemHealth();
  
  const stats = {
    system: systemHealth,
    services: {
      total: services.length,
      byStatus: {
        healthy: services.filter(s => s.status === 'healthy').length,
        degraded: services.filter(s => s.status === 'degraded').length,
        unhealthy: services.filter(s => s.status === 'unhealthy').length,
        unknown: services.filter(s => s.status === 'unknown').length
      },
      byType: {
        core: services.filter(s => s.type === 'core').length,
        microservice: services.filter(s => s.type === 'microservice').length,
        database: services.filter(s => s.type === 'database').length,
        cache: services.filter(s => s.type === 'cache').length,
        external: services.filter(s => s.type === 'external').length
      }
    },
    performance: {
      averageResponseTime: services.length > 0 
        ? (services.reduce((sum, s) => sum + s.responseTime, 0) / services.length).toFixed(2)
        : '0',
      totalChecks: services.reduce((sum, s) => sum + s.successCount + s.errorCount, 0),
      totalErrors: services.reduce((sum, s) => sum + s.errorCount, 0),
      overallSuccessRate: (() => {
        const totalChecks = services.reduce((sum, s) => sum + s.successCount + s.errorCount, 0);
        const totalSuccesses = services.reduce((sum, s) => sum + s.successCount, 0);
        return totalChecks > 0 ? ((totalSuccesses / totalChecks) * 100).toFixed(2) : '0.00';
      })()
    },
    timestamp: new Date().toISOString()
  };

  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'health_stats_accessed',
    { 
      totalServices: stats.services.total,
      healthyServices: stats.services.byStatus.healthy
    },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json(stats);
}));

export default router;
