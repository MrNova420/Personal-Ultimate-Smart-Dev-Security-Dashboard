import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { errorHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { validateEnvironment } from '@/config/environment';
import { securityMonitor } from '@/security/securityMonitor';
import { auditLogger } from '@/security/auditLogger';
import routes from '@/routes';

// Load environment variables
dotenv.config();

/**
 * NovaShield 2025 Backend Server
 * 
 * Enterprise-grade security and development platform backend API
 * Built with TypeScript, Express, and comprehensive security measures
 */
class NovaShieldServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000', 10);
    
    // Validate environment configuration
    validateEnvironment();
    
    // Initialize server components
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSecurityMonitoring();
    this.createServer();
  }

  /**
   * Initialize middleware stack with security-first approach
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging with security monitoring
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));

    // Custom security monitoring middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', async () => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Log security-relevant requests
        if (req.path.startsWith('/api/auth') || 
            req.path.startsWith('/api/security') || 
            statusCode >= 400) {
          
          const eventType = req.path.startsWith('/api/auth') ? 'auth' : 'system';
          const severity = statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low';
          const outcome = statusCode < 400 ? 'success' : 'failure';
          
          await auditLogger.logSecurityEvent(
            eventType,
            severity,
            `${req.method} ${req.path}`,
            {
              statusCode,
              responseTime,
              userAgent: req.get('User-Agent'),
              body: req.method === 'POST' ? '***REDACTED***' : undefined
            },
            {
              userId: req.user?.id,
              sessionId: req.sessionID,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              outcome
            }
          );
          
          // Send event to security monitor for analysis
          securityMonitor.processEvent({
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            eventType,
            severity,
            userId: req.user?.id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            action: `${req.method} ${req.path}`,
            outcome,
            details: { statusCode, responseTime }
          });
        }
      });
      
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'novashield-backend',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
    });
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // 404 handler for unknown routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Initialize security monitoring and audit logging
   */
  private initializeSecurityMonitoring(): void {
    // Initialize security monitoring with default alert rules
    const defaultRules = [
      {
        id: 'brute_force_login',
        name: 'Brute Force Login Detection',
        eventType: 'auth',
        condition: {
          field: 'outcome',
          operator: 'equals' as const,
          value: 'failure'
        },
        threshold: {
          count: 5,
          timeWindow: 15 // 15 minutes
        },
        severity: 'high' as const,
        actions: ['log', 'alert', 'block'] as const,
        enabled: true
      },
      {
        id: 'suspicious_login_location',
        name: 'Suspicious Login Location',
        eventType: 'auth',
        condition: {
          field: 'action',
          operator: 'equals' as const,
          value: 'login_success'
        },
        severity: 'medium' as const,
        actions: ['log', 'alert'] as const,
        enabled: true
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Attempt',
        eventType: 'authorization',
        condition: {
          field: 'outcome',
          operator: 'equals' as const,
          value: 'failure'
        },
        threshold: {
          count: 3,
          timeWindow: 5 // 5 minutes
        },
        severity: 'critical' as const,
        actions: ['log', 'alert', 'block'] as const,
        enabled: true
      }
    ];

    // Add default alert rules to security monitor
    defaultRules.forEach(rule => securityMonitor.addAlertRule(rule));

    // Set up event listeners for real-time alerts
    securityMonitor.on('threatDetected', (threat) => {
      logger.warn('🚨 Security threat detected', threat);
      
      // In a real deployment, this would trigger notifications
      // For localhost, we log to console and audit trail
    });

    // Log security monitoring initialization
    auditLogger.logSecurityEvent(
      'system',
      'medium',
      'security_monitoring_initialized',
      { 
        rulesLoaded: defaultRules.length,
        monitoringActive: true 
      },
      {
        ipAddress: '127.0.0.1',
        outcome: 'success'
      }
    );

    logger.info('🛡️ Security monitoring system initialized', { 
      alertRules: defaultRules.length 
    });
  }

  /**
   * Create HTTP server and initialize Socket.IO
   */
  private createServer(): void {
    this.server = createServer(this.app);
    
    // Initialize Socket.IO with security configuration
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    // Socket.IO connection handling
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('authenticate', (token) => {
        // TODO: Implement JWT token validation
        logger.info(`Authentication attempt from ${socket.id}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client ${socket.id} disconnected: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error from ${socket.id}:`, error);
      });
    });
  }

  /**
   * Start the server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`🛡️ NovaShield Backend Server started on port ${this.port}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      logger.info(`📊 Health check available at: http://localhost:${this.port}/health`);
    });

    // Graceful shutdown handling
    this.setupGracefulShutdown();
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      this.server.close(() => {
        logger.info('HTTP server closed');
        
        // Close Socket.IO server
        this.io.close(() => {
          logger.info('Socket.IO server closed');
          process.exit(0);
        });
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get Socket.IO instance for use in other modules
   */
  public getSocketIO(): SocketIOServer {
    return this.io;
  }
}

// Create and start server
const server = new NovaShieldServer();
server.start();

export default server;