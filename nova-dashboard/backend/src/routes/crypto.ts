import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { quantumCrypto } from '@/security/quantumCrypto';
import { keyManager } from '@/security/keyManager';
import { logger } from '@/utils/logger';

/**
 * Quantum-Safe Cryptography API Routes
 * 
 * Provides secure cryptographic operations and key management
 * All operations are logged and audited for security compliance
 */

const router = Router();

// Get cryptographic system information
router.get('/info', asyncHandler(async (req, res) => {
  const cryptoInfo = quantumCrypto.getCryptoInfo();
  const keyStats = keyManager.getStatistics();
  
  res.json({
    success: true,
    data: {
      cryptography: cryptoInfo,
      keyManagement: keyStats,
      systemStatus: 'operational',
      quantumReadiness: 'partial', // Will be 'full' when post-quantum algorithms are implemented
    },
  });
}));

// Generate a secure token
router.post('/token', asyncHandler(async (req, res) => {
  const { length = 32 } = req.body;
  
  if (length < 16 || length > 128) {
    return res.status(400).json({
      success: false,
      error: 'Token length must be between 16 and 128 bytes',
    });
  }
  
  const token = quantumCrypto.generateSecureToken(length);
  
  logger.info('Secure token generated', {
    length,
    tokenLength: token.length,
    requestIp: req.ip,
  });
  
  res.json({
    success: true,
    data: {
      token,
      length: token.length,
      algorithm: 'CSPRNG',
    },
  });
}));

// Generate quantum-resistant hash
router.post('/hash', asyncHandler(async (req, res) => {
  const { data } = req.body;
  
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Data is required for hashing',
    });
  }
  
  const hash = quantumCrypto.generateQuantumHash(data);
  
  logger.info('Quantum hash generated', {
    inputLength: data.length,
    algorithm: 'SHA-3-512',
    requestIp: req.ip,
  });
  
  res.json({
    success: true,
    data: {
      hash,
      algorithm: 'SHA-3-512',
      inputLength: data.length,
    },
  });
}));

// Key Management Routes

// List public keys
router.get('/keys/public', asyncHandler(async (req, res) => {
  const publicKeys = keyManager.exportPublicKeys();
  
  res.json({
    success: true,
    data: {
      publicKeys,
      count: Object.keys(publicKeys).length,
    },
  });
}));

// Generate new key pair
router.post('/keys/generate', asyncHandler(async (req, res) => {
  const { keyId, purpose, tags } = req.body;
  
  if (!keyId || !purpose) {
    return res.status(400).json({
      success: false,
      error: 'keyId and purpose are required',
    });
  }
  
  // Check if key already exists
  if (keyManager.isKeyActive(keyId)) {
    return res.status(409).json({
      success: false,
      error: 'Key with this ID already exists',
    });
  }
  
  try {
    const keyPair = await keyManager.generateKeyPair(keyId, purpose, tags);
    
    logger.info('Key pair generated via API', {
      keyId,
      purpose,
      algorithm: keyPair.algorithm,
      requestIp: req.ip,
    });
    
    res.json({
      success: true,
      data: {
        keyId,
        publicKey: keyPair.publicKey,
        algorithm: keyPair.algorithm,
        keySize: keyPair.keySize,
        createdAt: keyPair.createdAt,
        expiresAt: keyPair.expiresAt,
      },
      message: 'Key pair generated successfully',
    });
  } catch (error) {
    logger.error('Key generation failed via API', {
      keyId,
      error: error.message,
      requestIp: req.ip,
    });
    
    res.status(500).json({
      success: false,
      error: 'Key generation failed',
    });
  }
}));

// Get public key by ID
router.get('/keys/:keyId/public', asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  
  const publicKey = keyManager.getPublicKey(keyId);
  
  if (!publicKey) {
    return res.status(404).json({
      success: false,
      error: 'Key not found or not active',
    });
  }
  
  res.json({
    success: true,
    data: {
      keyId,
      publicKey,
    },
  });
}));

// Rotate key
router.post('/keys/:keyId/rotate', asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  
  const newKeyPair = await keyManager.rotateKey(keyId);
  
  if (!newKeyPair) {
    return res.status(404).json({
      success: false,
      error: 'Key not found or rotation failed',
    });
  }
  
  logger.info('Key rotated via API', {
    originalKeyId: keyId,
    requestIp: req.ip,
  });
  
  res.json({
    success: true,
    data: {
      message: 'Key rotated successfully',
      newPublicKey: newKeyPair.publicKey,
      algorithm: newKeyPair.algorithm,
    },
  });
}));

// Revoke key
router.post('/keys/:keyId/revoke', asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { reason } = req.body;
  
  const success = await keyManager.revokeKey(keyId, reason);
  
  if (!success) {
    return res.status(404).json({
      success: false,
      error: 'Key not found or revocation failed',
    });
  }
  
  logger.info('Key revoked via API', {
    keyId,
    reason,
    requestIp: req.ip,
  });
  
  res.json({
    success: true,
    message: 'Key revoked successfully',
  });
}));

// List keys with metadata
router.get('/keys', asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const keys = keyManager.listKeys(status as any);
  
  res.json({
    success: true,
    data: {
      keys,
      count: keys.length,
      filter: status || 'all',
    },
  });
}));

// Get key audit log
router.get('/keys/:keyId/audit', asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  const { limit = 100 } = req.query;
  
  const auditLog = keyManager.getKeyAuditLog(keyId, parseInt(limit as string));
  
  res.json({
    success: true,
    data: {
      keyId,
      auditLog,
      count: auditLog.length,
    },
  });
}));

// Create backup
router.post('/backup', asyncHandler(async (req, res) => {
  try {
    const backupPath = await keyManager.createBackup();
    
    logger.info('Backup created via API', {
      backupPath,
      requestIp: req.ip,
    });
    
    res.json({
      success: true,
      data: {
        message: 'Backup created successfully',
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Backup creation failed via API', {
      error: error.message,
      requestIp: req.ip,
    });
    
    res.status(500).json({
      success: false,
      error: 'Backup creation failed',
    });
  }
}));

// Health check for cryptographic systems
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test basic cryptographic operations
    const testData = 'NovaShield quantum cryptography health check';
    const testKey = quantumCrypto.generateSecureKey();
    
    // Test encryption/decryption
    const encrypted = quantumCrypto.encryptAES256GCM(testData, testKey);
    const decrypted = quantumCrypto.decryptAES256GCM(encrypted, testKey);
    
    // Test hashing
    const hash = quantumCrypto.generateQuantumHash(testData);
    
    // Test HMAC
    const hmac = quantumCrypto.generateQuantumHMAC(testData, testKey);
    
    const isHealthy = decrypted === testData && hash.length > 0 && hmac.length > 0;
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        tests: {
          encryption: decrypted === testData,
          hashing: hash.length > 0,
          hmac: hmac.length > 0,
        },
        keyManager: {
          status: 'operational',
          statistics: keyManager.getStatistics(),
        },
      },
    });
  } catch (error) {
    logger.error('Cryptography health check failed', error);
    
    res.status(500).json({
      success: false,
      error: 'Cryptography health check failed',
      timestamp: new Date(),
    });
  }
}));

export default router;