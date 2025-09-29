// Temporary basic logger implementation for TypeScript compilation
// Will be replaced with full winston implementation once dependencies are installed

// Temporary basic logger implementation for TypeScript compilation
// Will be replaced with full winston implementation once dependencies are installed

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

// Basic logger interface for TypeScript compatibility
interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Temporary console logger implementation
const basicLogger: Logger = {
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  info: (message: string, meta?: any) => {
    console.info(`[INFO] ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
};

// Export the basic logger
export const logger = basicLogger;

// Export commonly used functions that match winston API
export const logError = (message: string, error: any) => {
  basicLogger.error(message, error);
};

export const logWarning = (message: string, data?: any) => {
  basicLogger.warn(message, data);
};

export const logInfo = (message: string, data?: any) => {
  basicLogger.info(message, data);
};

export const logDebug = (message: string, data?: any) => {
  basicLogger.debug(message, data);
};

export const logAudit = (event: string, data: any) => {
  basicLogger.info(`[AUDIT] ${event}`, data);
};

export const logSecurity = (event: string, data: any) => {
  basicLogger.error(`[SECURITY] ${event}`, data);
};

export const logPerformance = (metric: string, data: any) => {
  basicLogger.info(`[PERFORMANCE] ${metric}`, data);
};

export default logger;

