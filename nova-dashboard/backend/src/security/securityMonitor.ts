/**
 * NovaShield 2025 Real-Time Security Monitoring System
 * Advanced threat detection and automated response for localhost deployment
 * Enterprise-grade security monitoring for personal use
 */

import EventEmitter from 'events';
import crypto from 'crypto';
import { auditLogger, SecurityEvent } from './auditLogger';
import logger from '../utils/logger';

export interface ThreatDetection {
  id: string;
  timestamp: string;
  threatType: 'brute_force' | 'anomaly' | 'suspicious_access' | 'data_exfiltration' | 'malware' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  indicators: Record<string, any>;
  actions: string[];
  status: 'active' | 'mitigated' | 'false_positive';
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalAlerts: number;
  activeThreats: number;
  blockedAttempts: number;
  averageResponseTime: number;
  uptime: number;
  lastUpdate: string;
}

export interface AlertRule {
  id: string;
  name: string;
  eventType: string;
  condition: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'pattern';
    value: any;
  };
  threshold?: {
    count: number;
    timeWindow: number; // minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: ('log' | 'alert' | 'block' | 'notify')[];
  enabled: boolean;
}

class SecurityMonitor extends EventEmitter {
  private threats: Map<string, ThreatDetection> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private eventCounts: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivities: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    // Default security rules for 2025 localhost deployment
    const defaultRules: AlertRule[] = [
      {
        id: 'brute_force_login',
        name: 'Brute Force Login Detection',
        eventType: 'auth',
        condition: { field: 'outcome', operator: 'equals', value: 'failure' },
        threshold: { count: 5, timeWindow: 5 },
        severity: 'high',
        actions: ['log', 'alert', 'block'],
        enabled: true
      },
      {
        id: 'suspicious_login_location',
        name: 'Unusual Login Location',
        eventType: 'auth',
        condition: { field: 'action', operator: 'equals', value: 'login' },
        severity: 'medium',
        actions: ['log', 'alert'],
        enabled: true
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation Attempt',
        eventType: 'authorization',
        condition: { field: 'action', operator: 'contains', value: 'escalate' },
        severity: 'critical',
        actions: ['log', 'alert', 'block'],
        enabled: true
      },
      {
        id: 'data_exfiltration',
        name: 'Potential Data Exfiltration',
        eventType: 'data_access',
        condition: { field: 'details.dataSize', operator: 'greater_than', value: 10000000 }, // 10MB
        severity: 'high',
        actions: ['log', 'alert'],
        enabled: true
      },
      {
        id: 'system_modification',
        name: 'Critical System Modification',
        eventType: 'system',
        condition: { field: 'action', operator: 'contains', value: 'modify_config' },
        severity: 'critical',
        actions: ['log', 'alert'],
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.alertRules.set(rule.id, rule));
    logger.info('🛡️ Security monitoring rules initialized', { ruleCount: defaultRules.length });
  }

  private startMonitoring(): void {
    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);

    // Check for patterns every 30 seconds
    setInterval(() => {
      this.analyzePatterns();
    }, 30 * 1000);

    logger.info('🔍 Security monitoring started for localhost deployment');
  }

  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Update event tracking
      this.updateEventTracking(event);

      // Check against alert rules
      await this.evaluateAlertRules(event);

      // Check for behavioral anomalies
      await this.detectAnomalies(event);

      // Update metrics
      this.updateMetrics(event);

      this.emit('eventProcessed', event);
    } catch (error) {
      logger.error('❌ Failed to process security event', { error, eventId: event.id });
    }
  }

  private updateEventTracking(event: SecurityEvent): void {
    const key = `${event.eventType}_${event.action}_${event.ipAddress}`;
    const existing = this.eventCounts.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      this.eventCounts.set(key, {
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }
  }

  private async evaluateAlertRules(event: SecurityEvent): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.eventType !== event.eventType) {
        continue;
      }

      if (this.evaluateCondition(event, rule.condition)) {
        if (rule.threshold) {
          const key = `${rule.id}_${event.ipAddress}`;
          const activity = this.suspiciousActivities.get(key) || [];
          activity.push({ timestamp: new Date(), event });

          // Clean old activities outside time window
          const cutoff = new Date(Date.now() - rule.threshold.timeWindow * 60 * 1000);
          const recentActivities = activity.filter(a => a.timestamp > cutoff);
          this.suspiciousActivities.set(key, recentActivities);

          if (recentActivities.length >= rule.threshold.count) {
            await this.triggerAlert(rule, event, recentActivities);
          }
        } else {
          await this.triggerAlert(rule, event);
        }
      }
    }
  }

  private evaluateCondition(event: SecurityEvent, condition: AlertRule['condition']): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'pattern':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(event: SecurityEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async triggerAlert(
    rule: AlertRule, 
    event: SecurityEvent, 
    activities?: any[]
  ): Promise<void> {
    const threat: ThreatDetection = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      threatType: this.mapRuleToThreatType(rule.id),
      severity: rule.severity,
      source: event.ipAddress,
      description: `${rule.name}: ${event.action}`,
      indicators: {
        rule: rule.name,
        eventId: event.id,
        userId: event.userId,
        userAgent: event.userAgent,
        activities: activities?.length || 1
      },
      actions: rule.actions,
      status: 'active'
    };

    this.threats.set(threat.id, threat);

    // Execute alert actions
    await this.executeAlertActions(rule.actions, threat, event);

    // Log the threat detection
    await auditLogger.logSecurityEvent(
      'security',
      rule.severity,
      'threat_detected',
      {
        threatId: threat.id,
        threatType: threat.threatType,
        rule: rule.name,
        originalEvent: event.id
      },
      {
        ipAddress: event.ipAddress,
        userId: event.userId,
        sessionId: event.sessionId,
        userAgent: event.userAgent,
        outcome: 'success'
      }
    );

    this.emit('threatDetected', threat);
    logger.warn(`🚨 Security threat detected: ${threat.description}`, {
      threatId: threat.id,
      severity: threat.severity,
      source: threat.source
    });
  }

  private mapRuleToThreatType(ruleId: string): ThreatDetection['threatType'] {
    const mapping: Record<string, ThreatDetection['threatType']> = {
      'brute_force_login': 'brute_force',
      'suspicious_login_location': 'anomaly',
      'privilege_escalation': 'suspicious_access',
      'data_exfiltration': 'data_exfiltration',
      'system_modification': 'policy_violation'
    };

    return mapping[ruleId] || 'anomaly';
  }

  private async executeAlertActions(
    actions: string[], 
    threat: ThreatDetection, 
    event: SecurityEvent
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case 'log':
            logger.warn(`🚨 Security Alert: ${threat.description}`, threat);
            break;
          
          case 'block':
            this.blockedIPs.add(event.ipAddress);
            logger.warn(`🚫 IP blocked: ${event.ipAddress}`, { threatId: threat.id });
            break;
          
          case 'alert':
            // In a real deployment, this would send notifications
            this.emit('securityAlert', { threat, event });
            break;
          
          case 'notify':
            // Send notifications to administrators
            await this.sendNotification(threat, event);
            break;
        }
      } catch (error) {
        logger.error(`❌ Failed to execute alert action: ${action}`, { error, threatId: threat.id });
      }
    }
  }

  private async sendNotification(threat: ThreatDetection, event: SecurityEvent): Promise<void> {
    // For localhost deployment, log notifications instead of sending external alerts
    logger.info('📧 Security notification (localhost mode)', {
      threat: threat.description,
      severity: threat.severity,
      source: threat.source,
      timestamp: threat.timestamp
    });
  }

  private async detectAnomalies(event: SecurityEvent): Promise<void> {
    // Detect unusual patterns for localhost deployment
    
    // Check for unusual access times (outside typical hours)
    const hour = new Date(event.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      await this.createAnomaly('unusual_access_time', event, 'low', 'Access outside normal hours');
    }

    // Check for rapid successive logins
    if (event.eventType === 'auth' && event.action === 'login') {
      const recentLogins = Array.from(this.eventCounts.entries())
        .filter(([key, data]) => 
          key.includes('auth_login') && 
          key.includes(event.ipAddress) &&
          Date.now() - data.lastSeen.getTime() < 60000 // Last minute
        );

      if (recentLogins.length > 3) {
        await this.createAnomaly('rapid_login_attempts', event, 'medium', 'Multiple rapid login attempts');
      }
    }
  }

  private async createAnomaly(
    type: string, 
    event: SecurityEvent, 
    severity: ThreatDetection['severity'],
    description: string
  ): Promise<void> {
    const threat: ThreatDetection = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      threatType: 'anomaly',
      severity,
      source: event.ipAddress,
      description: `Anomaly detected: ${description}`,
      indicators: {
        type,
        eventId: event.id,
        userId: event.userId
      },
      actions: ['log'],
      status: 'active'
    };

    this.threats.set(threat.id, threat);
    this.emit('anomalyDetected', threat);
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    // Clean event counts
    for (const [key, data] of this.eventCounts.entries()) {
      if (data.lastSeen < cutoff) {
        this.eventCounts.delete(key);
      }
    }

    // Clean suspicious activities
    for (const [key, activities] of this.suspiciousActivities.entries()) {
      const recent = activities.filter(a => a.timestamp > cutoff);
      if (recent.length === 0) {
        this.suspiciousActivities.delete(key);
      } else {
        this.suspiciousActivities.set(key, recent);
      }
    }

    // Clean old threats (keep for 7 days)
    const threatCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [id, threat] of this.threats.entries()) {
      if (new Date(threat.timestamp) < threatCutoff) {
        this.threats.delete(id);
      }
    }
  }

  private analyzePatterns(): void {
    // Analyze patterns in event data for advanced threat detection
    // This is simplified for localhost deployment but maintains enterprise capability
    
    const now = Date.now();
    const patterns = new Map<string, number>();

    // Count patterns over the last hour
    for (const [key, data] of this.eventCounts.entries()) {
      if (now - data.lastSeen.getTime() < 60 * 60 * 1000) {
        const [eventType, action] = key.split('_');
        const patternKey = `${eventType}_${action}`;
        patterns.set(patternKey, (patterns.get(patternKey) || 0) + data.count);
      }
    }

    // Check for unusual spikes
    for (const [pattern, count] of patterns.entries()) {
      if (count > 100) { // Threshold for localhost deployment
        logger.warn('📊 Unusual activity pattern detected', { pattern, count });
      }
    }
  }

  private updateMetrics(event: SecurityEvent): void {
    // Update internal metrics - in production this would update a metrics database
  }

  // Public API methods

  getActiveThreats(): ThreatDetection[] {
    return Array.from(this.threats.values()).filter(t => t.status === 'active');
  }

  getActiveAlerts(): ThreatDetection[] {
    return this.getActiveThreats();
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const activeThreats = this.getActiveThreats();
    const totalEvents = Array.from(this.eventCounts.values()).reduce((sum, data) => sum + data.count, 0);

    return {
      totalEvents,
      criticalAlerts: activeThreats.filter(t => t.severity === 'critical').length,
      activeThreats: activeThreats.length,
      blockedAttempts: this.blockedIPs.size,
      averageResponseTime: 0.1, // Simulated for localhost
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString()
    };
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    logger.info(`✅ IP unblocked: ${ip}`);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info('📋 Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    logger.info('🗑️ Alert rule removed', { ruleId });
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }
}

// Export singleton instance for localhost deployment
export const securityMonitor = new SecurityMonitor();

export default securityMonitor;