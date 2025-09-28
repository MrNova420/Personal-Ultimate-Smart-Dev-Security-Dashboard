import { Router } from 'express';
import authRoutes from './auth';
import terminalRoutes from './terminal';
import securityRoutes from './security';
import monitoringRoutes from './monitoring';
import developmentRoutes from './development';
import cryptoRoutes from './crypto';
import gatewayRoutes from './gateway';
import messagingRoutes from './messaging';

/**
 * NovaShield API Routes
 * 
 * Central router configuration for all API endpoints
 * Implements security-first routing with API Gateway and messaging integration
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
    endpoints: {
      auth: '/api/auth',
      crypto: '/api/crypto',
      terminal: '/api/terminal',
      security: '/api/security',
      monitoring: '/api/monitoring',
      development: '/api/development',
      gateway: '/api/gateway',
      messaging: '/api/messaging'
    },
    microservices: {
      'security-engine': '/api/gateway/security-engine',
      'terminal-service': '/api/gateway/terminal',
      'monitoring-service': '/api/gateway/monitoring'
    },
    documentation: '/api/docs',
    health: '/health',
    status: 'operational',
    quantumSafe: true,
    timestamp: new Date().toISOString(),
  });
});

// Mount API Gateway routes first (highest priority)
router.use('/gateway', gatewayRoutes);

// Mount message queue routes
router.use('/messaging', messagingRoutes);

// Mount local service routes
router.use('/auth', authRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/terminal', terminalRoutes);
router.use('/security', securityRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/development', developmentRoutes);

export default router;