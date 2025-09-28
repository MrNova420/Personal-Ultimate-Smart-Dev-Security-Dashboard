import { Request, Response, NextFunction } from 'express';
import { logger, logError, logSecurity } from '@/utils/logger';

/**
 * NovaShield Error Handling Middleware
 * 
 * Comprehensive error handling with security-focused logging
 * Prevents sensitive information leakage while maintaining audit trails
 */

export interface NovaShieldError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

/**
 * Custom error classes for different types of errors
 */
export class ValidationError extends Error implements NovaShieldError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements NovaShieldError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements NovaShieldError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements NovaShieldError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements NovaShieldError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements NovaShieldError {
  statusCode = 429;
  code = 'RATE_LIMIT_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class SecurityError extends Error implements NovaShieldError {
  statusCode = 403;
  code = 'SECURITY_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Security violation detected') {
    super(message);
    this.name = 'SecurityError';
  }
}

export class DatabaseError extends Error implements NovaShieldError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  isOperational = true;
  
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: NovaShieldError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Ensure we have a proper error object
  if (!error) {
    return next();
  }
  
  // Extract error details
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const isOperational = error.isOperational || false;
  
  // Create request context for logging
  const requestContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || null,
    sessionId: (req as any).sessionID || null,
    timestamp: new Date().toISOString(),
  };
  
  // Log security-related errors with higher priority
  if (isSecurityRelated(error)) {
    logSecurity(`Security error: ${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        code,
        statusCode,
        stack: error.stack,
      },
      request: requestContext,
    });
  }
  
  // Log all errors for debugging and monitoring
  logError(error, `${req.method} ${req.originalUrl}`, {
    statusCode,
    code,
    isOperational,
    request: requestContext,
    details: error.details,
  });
  
  // Prepare response based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base error response
  const errorResponse: any = {
    error: {
      code,
      message: getPublicErrorMessage(error, statusCode),
      timestamp: new Date().toISOString(),
    },
  };
  
  // Add additional details in development
  if (isDevelopment) {
    errorResponse.error.details = {
      name: error.name,
      stack: error.stack,
      originalMessage: error.message,
      details: error.details,
    };
  }
  
  // Add request ID for tracking
  if (req.headers['x-request-id']) {
    errorResponse.error.requestId = req.headers['x-request-id'];
  }
  
  // Set security headers for error responses
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  });
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Determine if an error is security-related
 */
function isSecurityRelated(error: NovaShieldError): boolean {
  const securityErrorTypes = [
    'AuthenticationError',
    'AuthorizationError',
    'SecurityError',
    'RateLimitError',
  ];
  
  return securityErrorTypes.includes(error.name) || 
         error.code?.includes('SECURITY') ||
         error.code?.includes('AUTH');
}

/**
 * Get public-safe error message
 * Prevents sensitive information leakage in production
 */
function getPublicErrorMessage(error: NovaShieldError, statusCode: number): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, use generic messages for server errors
  if (isProduction && statusCode >= 500) {
    return 'Internal server error';
  }
  
  // Security errors should never expose details
  if (isSecurityRelated(error) && isProduction) {
    switch (statusCode) {
      case 401:
        return 'Authentication required';
      case 403:
        return 'Access denied';
      case 429:
        return 'Too many requests';
      default:
        return 'Security error';
    }
  }
  
  // For operational errors, return the actual message
  if (error.isOperational) {
    return error.message;
  }
  
  // Default fallback messages
  switch (statusCode) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 409:
      return 'Resource conflict';
    case 429:
      return 'Too many requests';
    case 500:
    default:
      return isProduction ? 'Internal server error' : error.message;
  }
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
export const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      type: 'UNCAUGHT_EXCEPTION',
    });
    
    // Give some time for logging before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection:', {
      reason: reason?.toString(),
      stack: reason?.stack,
      promise: promise.toString(),
      type: 'UNHANDLED_REJECTION',
    });
    
    // In production, exit the process
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
};