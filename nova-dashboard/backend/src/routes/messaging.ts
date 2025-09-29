/**
 * NovaShield Message Queue Management Routes
 * 
 * Provides endpoints for managing and monitoring the message queue system
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { messageQueue, MessageTypes } from '@/messaging/messageQueue';
import { auditLogger } from '@/security/auditLogger';

const router = Router();

/**
 * Get message queue status and statistics
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const stats = await messageQueue.getAllQueueStats();
  
  await auditLogger.logSecurityEvent(
    'system',
    'low',
    'message_queue_status_accessed',
    { activeQueues: stats.activeQueues },
    {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      outcome: 'success'
    }
  );

  res.json({
    messageQueue: 'NovaShield Message Queue System',
    version: '1.0.0',
    status: 'operational',
    ...stats
  });
}));

/**
 * Publish a message to a queue
 */
router.post('/publish', asyncHandler(async (req: Request, res: Response) => {
  const { queue, type, payload, target, priority = 'normal', maxRetries = 3 } = req.body;

  if (!queue || !type || !payload) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['queue', 'type', 'payload']
    });
  }

  try {
    const messageId = await messageQueue.publishMessage(queue, {
      type,
      payload,
      source: 'api',
      target,
      priority,
      maxRetries
    });

    await auditLogger.logSecurityEvent(
      'system',
      'medium',
      'message_published_via_api',
      {
        messageId,
        queue,
        type,
        priority,
        target
      },
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
      messageId,
      queue,
      type,
      priority,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(
      'system',
      'high',
      'message_publish_failed',
      {
        queue,
        type,
        error: error.message
      },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'failure'
      }
    );

    res.status(500).json({
      error: 'Failed to publish message',
      details: error.message,
      queue,
      type
    });
  }
}));

/**
 * Get queue-specific statistics
 */
router.get('/queue/:queueName/stats', asyncHandler(async (req: Request, res: Response) => {
  const { queueName } = req.params;
  
  try {
    const stats = await messageQueue.getQueueStats(queueName);
    
    await auditLogger.logSecurityEvent(
      'system',
      'low',
      'queue_stats_accessed',
      { queue: queueName, pendingMessages: stats.pendingMessages },
      {
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        outcome: 'success'
      }
    );
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get queue statistics',
      queue: queueName,
      details: error.message
    });
  }
}));

/**
 * Send inter-service notification
 */
router.post('/notify/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params;
  const { type, payload, priority = 'normal' } = req.body;

  if (!type || !payload) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['type', 'payload']
    });
  }

  try {
    const messageId = await messageQueue.publishMessage(`service:${serviceName}`, {
      type,
      payload,
      source: 'api-gateway',
      target: serviceName,
      priority,
      maxRetries: 3
    });

    await auditLogger.logSecurityEvent(
      'system',
      'medium',
      'inter_service_notification_sent',
      {
        messageId,
        targetService: serviceName,
        type,
        priority
      },
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
      messageId,
      targetService: serviceName,
      type,
      priority,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send notification',
      targetService: serviceName,
      details: error.message
    });
  }
}));

/**
 * Get available message types
 */
router.get('/message-types', asyncHandler(async (req: Request, res: Response) => {
  const messageTypes = Object.entries(MessageTypes).map(([key, value]) => ({
    key,
    type: value,
    description: getMessageTypeDescription(value)
  }));

  res.json({
    messageTypes,
    total: messageTypes.length,
    categories: {
      security: messageTypes.filter(mt => mt.type.startsWith('security.')),
      terminal: messageTypes.filter(mt => mt.type.startsWith('terminal.')),
      monitoring: messageTypes.filter(mt => mt.type.startsWith('monitoring.')),
      system: messageTypes.filter(mt => mt.type.startsWith('system.'))
    }
  });
}));

/**
 * Test message queue connectivity
 */
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    const testMessageId = await messageQueue.publishMessage('test', {
      type: 'system.test',
      payload: { message: 'Test message from API', timestamp: new Date().toISOString() },
      source: 'api',
      priority: 'low',
      maxRetries: 1
    });

    await auditLogger.logSecurityEvent(
      'system',
      'low',
      'message_queue_test',
      { testMessageId },
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
      testMessageId,
      message: 'Message queue test successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Message queue test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get message type descriptions
 */
function getMessageTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'security.alert': 'Security alert notification',
    'security.threat.detected': 'Threat detection notification',
    'security.access.denied': 'Access denied notification',
    'terminal.session.start': 'Terminal session started',
    'terminal.session.end': 'Terminal session ended',
    'terminal.command': 'Terminal command executed',
    'monitoring.metric.update': 'Metric data update',
    'monitoring.health.check': 'Health check result',
    'monitoring.alert.triggered': 'Monitoring alert triggered',
    'system.service.start': 'Service startup notification',
    'system.service.stop': 'Service shutdown notification',
    'system.config.update': 'Configuration update notification'
  };

  return descriptions[type] || 'Unknown message type';
}

export default router;
