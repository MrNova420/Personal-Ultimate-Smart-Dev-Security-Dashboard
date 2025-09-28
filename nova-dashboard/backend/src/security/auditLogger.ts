/**
 * NovaShield 2025 Enterprise Audit Logging System
 * Tamper-proof security event logging with cryptographic integrity
 * For personal localhost deployment with enterprise-grade security
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: 'auth' | 'authorization' | 'data_access' | 'system' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  signature?: string;
  previousHash?: string;
}

export interface AuditQuery {
  eventType?: string;
  severity?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  outcome?: string;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private logPath: string;
  private secretKey: string;
  private lastHash: string = '';

  constructor() {
    this.logPath = process.env.AUDIT_LOG_PATH || '/app/data/audit';
    this.secretKey = process.env.AUDIT_SECRET_KEY || crypto.randomBytes(32).toString('hex');
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
      logger.info('🔍 Audit log directory initialized', { path: this.logPath });
    } catch (error) {
      logger.error('❌ Failed to create audit log directory', { error, path: this.logPath });
      throw error;
    }
  }

  private generateSignature(event: Omit<SecurityEvent, 'signature'>): string {
    const data = JSON.stringify(event);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  async logSecurityEvent(
    eventType: SecurityEvent['eventType'],
    severity: SecurityEvent['severity'],
    action: string,
    details: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent?: string;
      resource?: string;
      outcome: SecurityEvent['outcome'];
    }
  ): Promise<string> {
    const event: Omit<SecurityEvent, 'signature'> = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      action,
      details,
      previousHash: this.lastHash,
      ...context
    };

    const signature = this.generateSignature(event);
    const signedEvent: SecurityEvent = { ...event, signature };

    // Update hash chain
    this.lastHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signedEvent))
      .digest('hex');

    // Persist to storage
    await this.persistEvent(signedEvent);

    // Log to console for development
    logger.info(`🛡️ Security Event: ${eventType}`, {
      id: event.id,
      action,
      severity,
      outcome: context.outcome,
      userId: context.userId
    });

    return event.id;
  }

  private async persistEvent(event: SecurityEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logPath, `audit_${today}.json`);

    try {
      // Read existing events
      let events: SecurityEvent[] = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf-8');
        events = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      // Add new event
      events.push(event);

      // Write back to file
      await fs.writeFile(logFile, JSON.stringify(events, null, 2));
    } catch (error) {
      logger.error('❌ Failed to persist audit event', { error, eventId: event.id });
      throw error;
    }
  }

  async queryEvents(query: AuditQuery): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    const logFiles = await this.getLogFiles(query.startDate, query.endDate);

    for (const file of logFiles) {
      try {
        const data = await fs.readFile(file, 'utf-8');
        const fileEvents: SecurityEvent[] = JSON.parse(data);
        events.push(...fileEvents);
      } catch (error) {
        logger.warn('⚠️ Failed to read audit log file', { file, error });
      }
    }

    // Filter events based on query
    let filteredEvents = events.filter(event => {
      if (query.eventType && event.eventType !== query.eventType) return false;
      if (query.severity && event.severity !== query.severity) return false;
      if (query.userId && event.userId !== query.userId) return false;
      if (query.outcome && event.outcome !== query.outcome) return false;
      if (query.startDate && new Date(event.timestamp) < query.startDate) return false;
      if (query.endDate && new Date(event.timestamp) > query.endDate) return false;
      return true;
    });

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    if (query.offset) {
      filteredEvents = filteredEvents.slice(query.offset);
    }
    if (query.limit) {
      filteredEvents = filteredEvents.slice(0, query.limit);
    }

    return filteredEvents;
  }

  private async getLogFiles(startDate?: Date, endDate?: Date): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logPath);
      const logFiles = files
        .filter(file => file.startsWith('audit_') && file.endsWith('.json'))
        .map(file => path.join(this.logPath, file));

      if (!startDate && !endDate) {
        return logFiles;
      }

      // Filter files by date range
      return logFiles.filter(file => {
        const fileName = path.basename(file);
        const dateMatch = fileName.match(/audit_(\d{4}-\d{2}-\d{2})\.json/);
        if (!dateMatch) return false;

        const fileDate = new Date(dateMatch[1]);
        if (startDate && fileDate < startDate) return false;
        if (endDate && fileDate > endDate) return false;
        return true;
      });
    } catch (error) {
      logger.error('❌ Failed to get log files', { error });
      return [];
    }
  }

  async verifyIntegrity(eventId: string): Promise<boolean> {
    try {
      const events = await this.queryEvents({ limit: 1000 });
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        return false;
      }

      const { signature, ...eventWithoutSignature } = event;
      const expectedSignature = this.generateSignature(eventWithoutSignature);
      
      return signature === expectedSignature;
    } catch (error) {
      logger.error('❌ Failed to verify event integrity', { error, eventId });
      return false;
    }
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const events = await this.queryEvents({ startDate, endDate });
    
    const report = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalEvents: events.length,
        criticalEvents: events.filter(e => e.severity === 'critical').length,
        highSeverityEvents: events.filter(e => e.severity === 'high').length,
        authenticationEvents: events.filter(e => e.eventType === 'auth').length,
        securityEvents: events.filter(e => e.eventType === 'security').length,
        failedEvents: events.filter(e => e.outcome === 'failure').length
      },
      events
    };

    if (format === 'csv') {
      return this.convertToCSV(events);
    }

    return JSON.stringify(report, null, 2);
  }

  private convertToCSV(events: SecurityEvent[]): string {
    const headers = [
      'id', 'timestamp', 'eventType', 'severity', 'userId', 'sessionId', 
      'ipAddress', 'action', 'resource', 'outcome', 'details'
    ];
    
    const csvRows = [
      headers.join(','),
      ...events.map(event => [
        event.id,
        event.timestamp,
        event.eventType,
        event.severity,
        event.userId || '',
        event.sessionId || '',
        event.ipAddress,
        event.action,
        event.resource || '',
        event.outcome,
        JSON.stringify(event.details).replace(/"/g, '""')
      ].map(field => `"${field}"`).join(','))
    ];

    return csvRows.join('\n');
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Convenience functions for common security events
export const logAuthEvent = (
  action: string,
  outcome: SecurityEvent['outcome'],
  details: Record<string, any>,
  context: { userId?: string; sessionId?: string; ipAddress: string; userAgent?: string }
) => auditLogger.logSecurityEvent('auth', outcome === 'failure' ? 'high' : 'medium', action, details, { ...context, outcome });

export const logSecurityViolation = (
  action: string,
  details: Record<string, any>,
  context: { userId?: string; sessionId?: string; ipAddress: string; userAgent?: string }
) => auditLogger.logSecurityEvent('security', 'critical', action, details, { ...context, outcome: 'blocked' });

export const logDataAccess = (
  resource: string,
  action: string,
  outcome: SecurityEvent['outcome'],
  details: Record<string, any>,
  context: { userId?: string; sessionId?: string; ipAddress: string; userAgent?: string }
) => auditLogger.logSecurityEvent('data_access', 'medium', action, details, { ...context, resource, outcome });

export default auditLogger;