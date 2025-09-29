import { Router } from 'express';
import authRoutes from './auth';
import terminalRoutes from './terminal';
import securityRoutes from './security';
import monitoringRoutes from './monitoring';
import developmentRoutes from './development';
import cryptoRoutes from './crypto';
import gatewayRoutes from './gateway';
import messagingRoutes from './messaging';
import healthRoutes from './health';
import loggingRoutes from './logging';

/**
 * NovaShield API Routes
 * 
 * Central router configuration for all API endpoints
 * Implements security-first routing with comprehensive system monitoring
 */

const router = Router();

// API versioning and documentation
router.get('/', (req, res) => {
  res.json({
    name: 'NovaShield 2025 Enterprise Security Platform API',
    version: '1.0.0',
    description: 'Enterprise-grade security and development platform backend API',
    gateway: 'Enabled with microservices routing',
    messaging: 'Enabled with inter-service communication',
    healthChecks: 'Enabled with comprehensive service discovery',
    distributedLogging: 'Enabled with real-time monitoring and alerting',
    endpoints: {
      auth: '/api/auth',
      crypto: '/api/crypto',
      terminal: '/api/terminal',
      security: '/api/security',
      monitoring: '/api/monitoring',
      development: '/api/development',
      gateway: '/api/gateway',
      messaging: '/api/messaging',
      health: '/api/health',
      logging: '/api/logging'
    },
    microservices: {
      'security-engine': '/api/gateway/security-engine',
      'terminal-service': '/api/gateway/terminal',
      'monitoring-service': '/api/gateway/monitoring'
    },
    systemEndpoints: {
      health: '/health',
      ready: '/api/health/ready',
      live: '/api/health/live',
      services: '/api/health/services',
      registry: '/api/health/registry',
      logs: '/api/logging/logs',
      metrics: '/api/logging/metrics',
      logStream: '/api/logging/stream'
    },
    documentation: '/api/docs',
    status: 'operational',
    quantumSafe: true,
    timestamp: new Date().toISOString(),
  });
});

// Mount health check routes first (critical system endpoints)
router.use('/health', healthRoutes);

// Mount API Gateway routes (highest priority for routing)
router.use('/gateway', gatewayRoutes);

// Mount messaging and logging routes
router.use('/messaging', messagingRoutes);
router.use('/logging', loggingRoutes);

// Mount local service routes
router.use('/auth', authRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/terminal', terminalRoutes);
router.use('/security', securityRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/development', developmentRoutes);

export default router;