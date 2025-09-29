import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { auditLogger, logSecurityViolation } from '../security/auditLogger';
import { securityMonitor } from '../security/securityMonitor';

const router = Router();

// Get security alerts
router.get('/alerts', asyncHandler(async (req, res) => {
  try {
    const alerts = await securityMonitor.getActiveAlerts();
    
    // Log access to security alerts
    await auditLogger.logSecurityEvent(
      'data_access',
      'medium',
      'security_alerts_accessed',
      { alertCount: alerts.length },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'success'
      }
    );
    
    res.json({
      success: true,
      alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'security',
      'high',
      'security_alerts_access_failed',
      { error: error.message },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );
    throw error;
  }
}));

// Get security audit logs
router.get('/audit-logs', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate, eventType, severity, limit = 100, offset = 0 } = req.query;
    
    const query = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      eventType: eventType as string,
      severity: severity as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };
    
    const events = await auditLogger.queryEvents(query);
    
    // Log access to audit logs
    await auditLogger.logSecurityEvent(
      'data_access',
      'high',
      'audit_logs_accessed',
      { query, resultCount: events.length },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'success'
      }
    );
    
    res.json({
      success: true,
      events,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'security',
      'critical',
      'audit_logs_access_failed',
      { error: error.message },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );
    throw error;
  }
}));

// Generate compliance report
router.post('/compliance-report', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Start date and end date are required',
        message: 'Please provide startDate and endDate in ISO format'
      });
    }
    
    const report = await auditLogger.generateComplianceReport(
      new Date(startDate),
      new Date(endDate),
      format
    );
    
    // Log compliance report generation
    await auditLogger.logSecurityEvent(
      'compliance',
      'medium',
      'compliance_report_generated',
      { 
        startDate, 
        endDate, 
        format,
        reportSize: report.length 
      },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'success'
      }
    );
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${startDate}-${endDate}.csv`);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }
    
    res.send(report);
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'security',
      'high',
      'compliance_report_failed',
      { error: error.message },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );
    throw error;
  }
}));

// Get security metrics
router.get('/metrics', asyncHandler(async (req, res) => {
  try {
    const metrics = await securityMonitor.getSecurityMetrics();
    
    // Log metrics access
    await auditLogger.logSecurityEvent(
      'data_access',
      'low',
      'security_metrics_accessed',
      { metricsCount: Object.keys(metrics).length },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'success'
      }
    );
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'security',
      'medium',
      'security_metrics_access_failed',
      { error: error.message },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );
    throw error;
  }
}));

// Security event verification endpoint
router.post('/verify-event/:eventId', asyncHandler(async (req, res) => {
  try {
    const { eventId } = req.params;
    const isValid = await auditLogger.verifyIntegrity(eventId);
    
    // Log verification attempt
    await auditLogger.logSecurityEvent(
      'security',
      'medium',
      'event_integrity_verified',
      { eventId, isValid },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: isValid ? 'success' : 'failure'
      }
    );
    
    res.json({
      success: true,
      eventId,
      isValid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'security',
      'high',
      'event_verification_failed',
      { eventId: req.params.eventId, error: error.message },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );
    throw error;
  }
}));

export default router;