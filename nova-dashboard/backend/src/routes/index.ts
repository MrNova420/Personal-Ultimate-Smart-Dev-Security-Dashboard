import { Router } from 'express';
import authRoutes from './auth';
import terminalRoutes from './terminal';
import securityRoutes from './security';
import monitoringRoutes from './monitoring';
import developmentRoutes from './development';

/**
 * NovaShield API Routes
 * 
 * Central router configuration for all API endpoints
 * Implements security-first routing with proper middleware
 */

const router = Router();

// API versioning and documentation
router.get('/', (req, res) => {
  res.json({
    name: 'NovaShield 2025 Enterprise Security Platform API',
    version: '1.0.0',
    description: 'Enterprise-grade security and development platform backend API',
    endpoints: {
      auth: '/api/auth',
      terminal: '/api/terminal',
      security: '/api/security',
      monitoring: '/api/monitoring',
      development: '/api/development',
    },
    documentation: '/api/docs',
    health: '/health',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/terminal', terminalRoutes);
router.use('/security', securityRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/development', developmentRoutes);

export default router;