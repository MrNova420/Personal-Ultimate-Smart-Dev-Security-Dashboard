/**
 * NovaShield 2025 API Gateway Middleware
 * 
 * Centralized API Gateway for microservices routing with:
 * - Service discovery and load balancing
 * - Advanced rate limiting and security
 * - Request/response transformation
 * - Circuit breaker pattern
 * - Health check and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger';
import { auditLogger } from '../security/auditLogger';

// Service registry with health status
interface ServiceEndpoint {
  name: string;
  url: string;
  healthCheck: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
}

class APIGateway {
  private services: Map<string, ServiceEndpoint> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices(): void {
    const services = [
      {
        name: 'security-engine',
        url: process.env.SECURITY_ENGINE_URL || 'http://security-engine:8001',
        healthCheck: '/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      {
        name: 'terminal-service',
        url: process.env.TERMINAL_SERVICE_URL || 'http://terminal-service:8080',
        healthCheck: '/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      {
        name: 'monitoring-service',
        url: process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:9090',
        healthCheck: '/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      }
    ];

    services.forEach(service => {
      this.services.set(service.name, service);
      this.circuitBreakers.set(service.name, new CircuitBreaker(service.name));
    });

    logger.info('🌐 API Gateway initialized with services', { 
      services: Array.from(this.services.keys()) 
    });
  }

  private async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      for (const [name, service] of this.services.entries()) {
        try {
          const start = Date.now();
          const response = await axios.get(`${service.url}${service.healthCheck}`, {
            timeout: 5000
          });
          
          const responseTime = Date.now() - start;
          service.isHealthy = response.status === 200;
          service.lastHealthCheck = new Date();
          service.avgResponseTime = (service.avgResponseTime + responseTime) / 2;
          
          logger.debug(`✅ Health check passed for ${name}`, { 
            responseTime, 
            status: response.status 
          });
        } catch (error) {
          service.isHealthy = false;
          service.lastHealthCheck = new Date();
          service.errorCount++;
          
          logger.warn(`❌ Health check failed for ${name}`, { 
            error: error.message,
            errorCount: service.errorCount
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Route requests to appropriate microservice
   */
  async routeRequest(serviceName: string, req: Request, res: Response): Promise<void> {
    const service = this.services.get(serviceName);
    
    if (!service) {
      return this.sendError(res, 404, 'Service not found', { serviceName });
    }

    if (!service.isHealthy) {
      return this.sendError(res, 503, 'Service unavailable', { serviceName });
    }

    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker && circuitBreaker.isOpen()) {
      return this.sendError(res, 503, 'Service circuit breaker open', { serviceName });
    }

    try {
      const start = Date.now();
      
      // Forward request to microservice
      const response = await this.forwardRequest(service, req);
      
      const responseTime = Date.now() - start;
      
      // Update service metrics
      service.requestCount++;
      service.avgResponseTime = (service.avgResponseTime + responseTime) / 2;
      
      // Log successful request
      await auditLogger.logSecurityEvent(
        'system',
        'low',
        `gateway_request_${serviceName}`,
        {
          method: req.method,
          path: req.path,
          responseTime,
          statusCode: response.status
        },
        {
          userId: req.user?.id,
          sessionId: req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'success'
        }
      );

      // Set response headers and send response
      Object.entries(response.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-encoding') {
          res.setHeader(key, value as string);
        }
      });

      res.status(response.status).json(response.data);
      
    } catch (error) {
      service.errorCount++;
      
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }
      
      logger.error(`🚨 Gateway routing error for ${serviceName}`, {
        error: error.message,
        method: req.method,
        path: req.path
      });

      await auditLogger.logSecurityEvent(
        'system',
        'high',
        `gateway_error_${serviceName}`,
        {
          error: error.message,
          method: req.method,
          path: req.path
        },
        {
          userId: req.user?.id,
          sessionId: req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          outcome: 'failure'
        }
      );

      this.sendError(res, 502, 'Gateway error', { 
        serviceName, 
        error: error.message 
      });
    }
  }

  private async forwardRequest(service: ServiceEndpoint, req: Request): Promise<AxiosResponse> {
    const url = `${service.url}${req.path}`;
    
    const config = {
      method: req.method.toLowerCase() as any,
      url,
      headers: {
        ...req.headers,
        'X-Forwarded-For': req.ip,
        'X-Gateway-Request-ID': req.headers['x-request-id'] || 'unknown'
      },
      timeout: 30000,
      data: req.body
    };

    delete config.headers.host;
    delete config.headers.authorization; // Handle auth separately if needed

    return await axios(config);
  }

  private sendError(res: Response, status: number, message: string, details?: any): void {
    res.status(status).json({
      error: message,
      details,
      timestamp: new Date().toISOString(),
      gateway: 'novashield-api-gateway'
    });
  }

  /**
   * Get service status for monitoring
   */
  getServicesStatus(): any {
    const services = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      url: service.url,
      isHealthy: service.isHealthy,
      lastHealthCheck: service.lastHealthCheck,
      requestCount: service.requestCount,
      errorCount: service.errorCount,
      avgResponseTime: service.avgResponseTime,
      circuitBreakerState: this.circuitBreakers.get(name)?.getState()
    }));

    return {
      services,
      totalServices: services.length,
      healthyServices: services.filter(s => s.isHealthy).length,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Simple Circuit Breaker implementation
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private serviceName: string,
    private failureThreshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`🔥 Circuit breaker OPEN for ${this.serviceName}`, {
        failures: this.failures,
        threshold: this.failureThreshold
      });
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  isOpen(): boolean {
    if (this.state === 'CLOSED') return false;
    
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`🔄 Circuit breaker HALF_OPEN for ${this.serviceName}`);
        return false;
      }
    }
    
    return this.state === 'OPEN';
  }

  getState(): string {
    return this.state;
  }
}

// Create singleton instance
export const apiGateway = new APIGateway();

/**
 * Enhanced rate limiting middleware for different service types
 */
export const createServiceRateLimit = (serviceName: string) => {
  const limits = {
    'security-engine': { windowMs: 5 * 60 * 1000, max: 50 }, // 50 requests per 5 minutes
    'terminal-service': { windowMs: 1 * 60 * 1000, max: 30 }, // 30 requests per minute
    'monitoring-service': { windowMs: 1 * 60 * 1000, max: 100 }, // 100 requests per minute
    'default': { windowMs: 15 * 60 * 1000, max: 100 }
  };

  const config = limits[serviceName] || limits.default;

  return rateLimit({
    ...config,
    message: {
      error: `Rate limit exceeded for ${serviceName}`,
      service: serviceName,
      windowMs: config.windowMs,
      max: config.max
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Create unique key combining IP, user ID, and service
      return `${req.ip}:${req.user?.id || 'anonymous'}:${serviceName}`;
    }
  });
};

/**
 * Gateway middleware for service routing
 */
export const gatewayMiddleware = (serviceName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await apiGateway.routeRequest(serviceName, req, res);
    } catch (error) {
      logger.error('🚨 Gateway middleware error', { error: error.message, serviceName });
      res.status(500).json({
        error: 'Internal gateway error',
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    }
  };
};

export default apiGateway;