import { logger } from '@/utils/logger';

/**
 * NovaShield Environment Configuration and Validation
 * 
 * Validates all required environment variables for security and functionality
 * Ensures secure defaults and warns about production readiness
 */

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  CORS_ORIGIN: string;
  
  // Service URLs
  SECURITY_ENGINE_URL: string;
  AI_ENGINE_URL: string;
  TERMINAL_SERVICE_URL: string;
  MONITORING_SERVICE_URL: string;
  
  // Security settings
  BCRYPT_ROUNDS: number;
  JWT_EXPIRY: string;
  SESSION_SECRET: string;
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: string;
  
  // SSL/TLS
  SSL_CERT_PATH?: string;
  SSL_KEY_PATH?: string;
  
  // Database encryption
  DB_ENCRYPTION_KEY?: string;
  
  // External services (optional)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: boolean;
}

/**
 * Default configuration values with security-first approach
 */
const defaultConfig: Partial<EnvironmentConfig> = {
  NODE_ENV: 'development',
  PORT: 5000,
  CORS_ORIGIN: 'http://localhost:3000',
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRY: '24h',
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  LOG_LEVEL: 'info',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
};

/**
 * Required environment variables that must be set
 */
const requiredVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
];

/**
 * Validate and parse environment variables
 */
export function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Security validations
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  }
  
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long for security');
  }
  
  // Production readiness checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH) {
      warnings.push('SSL certificates not configured for production deployment');
    }
    
    if (!process.env.DB_ENCRYPTION_KEY) {
      warnings.push('Database encryption key not set for production');
    }
    
    if (process.env.CORS_ORIGIN === 'http://localhost:3000') {
      errors.push('CORS_ORIGIN must be configured for production (not localhost)');
    }
    
    // Check for weak secrets in production
    if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      errors.push('JWT_SECRET is using default value - must be changed for production');
    }
  }
  
  // Development warnings
  if (process.env.NODE_ENV === 'development') {
    if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
      warnings.push('Using default JWT_SECRET in development - remember to change for production');
    }
  }
  
  // Validate URLs
  const urlVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'SECURITY_ENGINE_URL',
    'AI_ENGINE_URL',
    'TERMINAL_SERVICE_URL',
    'MONITORING_SERVICE_URL',
  ];
  
  for (const urlVar of urlVars) {
    const url = process.env[urlVar];
    if (url && !isValidUrl(url)) {
      errors.push(`Invalid URL format for ${urlVar}: ${url}`);
    }
  }
  
  // Report errors and warnings
  if (errors.length > 0) {
    logger.error('Environment validation failed:', { errors });
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }
  
  // Build configuration object
  const config: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || defaultConfig.NODE_ENV!,
    PORT: parseInt(process.env.PORT || defaultConfig.PORT!.toString(), 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || defaultConfig.CORS_ORIGIN!,
    
    // Service URLs with defaults
    SECURITY_ENGINE_URL: process.env.SECURITY_ENGINE_URL || 'http://localhost:8001',
    AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:8002',
    TERMINAL_SERVICE_URL: process.env.TERMINAL_SERVICE_URL || 'http://localhost:8080',
    MONITORING_SERVICE_URL: process.env.MONITORING_SERVICE_URL || 'http://localhost:9090',
    
    // Security settings
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || defaultConfig.BCRYPT_ROUNDS!.toString(), 10),
    JWT_EXPIRY: process.env.JWT_EXPIRY || defaultConfig.JWT_EXPIRY!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || defaultConfig.RATE_LIMIT_WINDOW_MS!.toString(),
      10
    ),
    RATE_LIMIT_MAX_REQUESTS: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || defaultConfig.RATE_LIMIT_MAX_REQUESTS!.toString(),
      10
    ),
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || defaultConfig.LOG_LEVEL!,
    
    // Optional SSL configuration
    SSL_CERT_PATH: process.env.SSL_CERT_PATH,
    SSL_KEY_PATH: process.env.SSL_KEY_PATH,
    
    // Optional database encryption
    DB_ENCRYPTION_KEY: process.env.DB_ENCRYPTION_KEY,
    
    // Optional SMTP configuration
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : defaultConfig.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  };
  
  // Log successful validation
  logger.info('Environment validation successful', {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    corsOrigin: config.CORS_ORIGIN,
    hasSSL: !!(config.SSL_CERT_PATH && config.SSL_KEY_PATH),
    hasDbEncryption: !!config.DB_ENCRYPTION_KEY,
    hasSMTP: !!config.SMTP_HOST,
  });
  
  return config;
}

/**
 * Simple URL validation
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    // Check for file:// URLs (SQLite)
    return string.startsWith('file:') || string.startsWith('sqlite:');
  }
}

/**
 * Get current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return validateEnvironment();
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get secure configuration summary (without sensitive data)
 */
export function getConfigSummary() {
  const config = getEnvironmentConfig();
  
  return {
    environment: config.NODE_ENV,
    port: config.PORT,
    corsOrigin: config.CORS_ORIGIN,
    services: {
      security: config.SECURITY_ENGINE_URL,
      ai: config.AI_ENGINE_URL,
      terminal: config.TERMINAL_SERVICE_URL,
      monitoring: config.MONITORING_SERVICE_URL,
    },
    security: {
      bcryptRounds: config.BCRYPT_ROUNDS,
      jwtExpiry: config.JWT_EXPIRY,
      hasSSL: !!(config.SSL_CERT_PATH && config.SSL_KEY_PATH),
      hasDbEncryption: !!config.DB_ENCRYPTION_KEY,
    },
    rateLimit: {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
    },
  };
}