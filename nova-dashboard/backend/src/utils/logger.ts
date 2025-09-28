import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * NovaShield Enterprise Logger
 * 
 * Comprehensive logging system with security-focused features:
 * - Structured JSON logging
 * - Log rotation and archival
 * - Security event tracking
 * - Performance monitoring
 * - Audit trail maintenance
 */

// Define log levels with security focus
const logLevels = {
  error: 0,
  warn: 1,
  security: 2,
  audit: 3,
  info: 4,
  debug: 5,
};

// Custom colors for log levels
const logColors = {
  error: 'red',
  warn: 'yellow',
  security: 'magenta',
  audit: 'cyan',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), '..', 'logs');

// Common log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Application logger configuration
const applicationTransports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  }),
  
  // Daily rotate file for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'application', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'debug',
    format: logFormat,
  }),
  
  // Error logs only
  new DailyRotateFile({
    filename: path.join(logsDir, 'application', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '90d',
    level: 'error',
    format: logFormat,
  }),
];

// Security logger configuration (separate from application logs)
const securityTransports: winston.transport[] = [
  // Security events log
  new DailyRotateFile({
    filename: path.join(logsDir, 'security', 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '50m',
    maxFiles: '365d', // Keep security logs for 1 year
    level: 'security',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.prettyPrint()
    ),
  }),
];

// Audit logger configuration (critical for compliance)
const auditTransports: winston.transport[] = [
  // Audit trail log
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit', 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '2555d', // Keep audit logs for 7 years (compliance requirement)
    level: 'audit',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.prettyPrint()
    ),
  }),
];

// Create loggers
const logger = winston.createLogger({
  levels: logLevels,
  transports: applicationTransports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
});

const securityLogger = winston.createLogger({
  levels: logLevels,
  transports: securityTransports,
  exitOnError: false,
});

const auditLogger = winston.createLogger({
  levels: logLevels,
  transports: auditTransports,
  exitOnError: false,
});

/**
 * Enhanced logging functions with security context
 */
export const logSecurity = (message: string, meta: any = {}) => {
  const securityEvent = {
    ...meta,
    timestamp: new Date().toISOString(),
    type: 'SECURITY_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  
  securityLogger.log('security', message, securityEvent);
  logger.log('security', message, securityEvent);
};

export const logAudit = (action: string, userId: string | null, resource: string, meta: any = {}) => {
  const auditEvent = {
    ...meta,
    action,
    userId,
    resource,
    timestamp: new Date().toISOString(),
    type: 'AUDIT_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
    sessionId: meta.sessionId || null,
    ipAddress: meta.ipAddress || null,
    userAgent: meta.userAgent || null,
  };
  
  auditLogger.log('audit', `${action} on ${resource} by ${userId || 'anonymous'}`, auditEvent);
  logger.log('audit', `${action} on ${resource} by ${userId || 'anonymous'}`, auditEvent);
};

export const logAuthentication = (event: string, userId: string | null, success: boolean, meta: any = {}) => {
  const authEvent = {
    ...meta,
    event,
    userId,
    success,
    timestamp: new Date().toISOString(),
    type: 'AUTH_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  
  const level = success ? 'info' : 'security';
  const message = `Authentication ${event}: ${success ? 'SUCCESS' : 'FAILED'} for ${userId || 'anonymous'}`;
  
  logger.log(level, message, authEvent);
  
  if (!success) {
    securityLogger.log('security', message, authEvent);
  }
};

export const logError = (error: Error, context: string = '', meta: any = {}) => {
  const errorEvent = {
    ...meta,
    context,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    type: 'ERROR_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  
  logger.error(`${context}: ${error.message}`, errorEvent);
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta: any = {}) => {
  const perfEvent = {
    ...meta,
    operation,
    duration,
    timestamp: new Date().toISOString(),
    type: 'PERFORMANCE_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  
  logger.info(`Performance: ${operation} took ${duration}ms`, perfEvent);
};

// Database operation logging
export const logDatabase = (operation: string, table: string, affected: number, meta: any = {}) => {
  const dbEvent = {
    ...meta,
    operation,
    table,
    affected,
    timestamp: new Date().toISOString(),
    type: 'DATABASE_EVENT',
    source: 'novashield-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  
  logger.debug(`Database: ${operation} on ${table} affected ${affected} rows`, dbEvent);
};

// Export the main logger with custom methods
export { logger };

// Export logger with additional security methods
export default {
  ...logger,
  security: logSecurity,
  audit: logAudit,
  auth: logAuthentication,
  error: logError,
  performance: logPerformance,
  database: logDatabase,
};