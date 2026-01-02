/**
 * E2E Encryption Middleware
 * Automatically handles encrypted requests and responses for all API routes
 * 
 * For POST/PUT/PATCH: Client sends encrypted body with payload.publicKey
 * For GET/DELETE: Client sends X-Client-Public-Key header
 */

import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../services/encryption.service';
import { config } from '../config';

interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  publicKey: string;
}

interface EncryptedRequest extends Request {
  body: {
    encrypted?: boolean;
    payload?: EncryptedPayload;
    [key: string]: any;
  };
  originalBody?: any;
  clientPublicKey?: string;
  isEncrypted?: boolean;
}

/**
 * Middleware to encrypt outgoing responses
 * MUST be applied BEFORE decryptRequest in the middleware chain
 */
export function encryptResponse(req: EncryptedRequest, res: Response, next: NextFunction) {
  // Skip if encryption is disabled
  if (!config.encryptionEnabled) {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to encrypt responses
  res.json = function(data: any): Response {
    // Get client public key from:
    // 1. Request property (set by decryptRequest for POST with encrypted body)
    // 2. X-Client-Public-Key header (for GET requests)
    // 3. x-client-public-key header (lowercase version)
    const headerKey = req.headers['x-client-public-key'] || req.headers['X-Client-Public-Key'];
    const clientPublicKey = req.clientPublicKey || (typeof headerKey === 'string' ? headerKey : undefined);
    
    if (clientPublicKey) {
      try {
        console.log('🔐 Encrypting response:', req.method, req.path);
        
        const encryptedResponse = encryptionService.createEncryptedResponse(
          data,
          clientPublicKey
        );
        
        console.log('✅ Response encrypted successfully');
        return originalJson(encryptedResponse);
      } catch (error) {
        console.error('❌ Response encryption failed:', error);
        // Fall through to unencrypted response on error
      }
    } else {
      // Skip logging for handshake/public-key endpoints
      if (!req.path.includes('handshake') && !req.path.includes('public-key')) {
        console.log('⚠️ No client public key for:', req.method, req.path);
        console.log('   Headers:', JSON.stringify(req.headers));
      }
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Middleware to decrypt incoming encrypted requests
 */
export function decryptRequest(req: EncryptedRequest, res: Response, next: NextFunction) {
  // Skip if encryption is disabled
  if (!config.encryptionEnabled) {
    return next();
  }

  try {
    // Check for client public key in header (for all request types)
    const headerKey = req.headers['x-client-public-key'] || req.headers['X-Client-Public-Key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) {
      req.clientPublicKey = headerKey;
      req.isEncrypted = true;
      console.log('🔑 Got client public key from header:', headerKey.substring(0, 20) + '...');
    }

    // Check if request body is encrypted (for POST/PUT/PATCH)
    if (req.body?.encrypted === true && req.body?.payload) {
      console.log('🔐 Processing encrypted request:', req.method, req.path);
      
      // Store client public key from payload (overrides header if present)
      req.clientPublicKey = req.body.payload.publicKey;
      req.isEncrypted = true;
      
      // Store original encrypted body
      req.originalBody = { ...req.body };
      
      // Decrypt the payload
      const decrypted = encryptionService.decryptRequest(req.body.payload);
      
      // Replace body with decrypted content
      req.body = decrypted;
      
      console.log('✅ Request decrypted successfully');
    }
    
    next();
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to decrypt request',
      code: 'DECRYPTION_ERROR',
    });
  }
}

/**
 * Combined middleware for E2E encryption
 */
export function e2eEncryption(req: EncryptedRequest, res: Response, next: NextFunction) {
  // Skip if encryption is disabled
  if (!config.encryptionEnabled) {
    return next();
  }

  // First: Set up response encryption
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any): Response {
    const headerKey = req.headers['x-client-public-key'] || req.headers['X-Client-Public-Key'];
    const clientPublicKey = req.clientPublicKey || (typeof headerKey === 'string' ? headerKey : undefined);
    
    if (clientPublicKey) {
      try {
        const encryptedResponse = encryptionService.createEncryptedResponse(
          data,
          clientPublicKey
        );
        return originalJson(encryptedResponse);
      } catch (error) {
        console.error('Response encryption failed:', error);
      }
    }
    return originalJson(data);
  };
  
  // Second: Handle client public key and decrypt request if needed
  try {
    // Check header for public key
    const headerKey = req.headers['x-client-public-key'] || req.headers['X-Client-Public-Key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) {
      req.clientPublicKey = headerKey;
      req.isEncrypted = true;
    }

    // Decrypt body if encrypted
    if (req.body?.encrypted === true && req.body?.payload) {
      req.clientPublicKey = req.body.payload.publicKey;
      req.isEncrypted = true;
      req.originalBody = { ...req.body };
      req.body = encryptionService.decryptRequest(req.body.payload);
    }
    next();
  } catch (error) {
    console.error('Decryption failed:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to decrypt request',
      code: 'DECRYPTION_ERROR',
    });
  }
}

/**
 * Middleware to handle handshake (key exchange)
 */
export function handleHandshake(req: Request, res: Response) {
  try {
    const { clientPublicKey } = req.body;
    
    console.log('🤝 Handshake request received');
    console.log('   Encryption enabled:', config.encryptionEnabled);
    
    if (!clientPublicKey) {
      return res.status(400).json({
        success: false,
        message: 'Client public key is required',
        code: 'MISSING_PUBLIC_KEY',
      });
    }

    const serverPublicKey = encryptionService.getPublicKey();
    
    console.log('✅ Handshake successful');
    
    res.status(200).json({
      success: true,
      message: 'Handshake successful',
      data: {
        serverPublicKey,
        encryptionEnabled: config.encryptionEnabled,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Handshake failed:', error);
    res.status(500).json({
      success: false,
      message: 'Handshake failed',
      code: 'HANDSHAKE_ERROR',
    });
  }
}

/**
 * Get server's public key
 */
export function getServerPublicKey(req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: {
      publicKey: encryptionService.getPublicKey(),
      encryptionEnabled: config.encryptionEnabled,
    },
  });
}

export default {
  decryptRequest,
  encryptResponse,
  e2eEncryption,
  handleHandshake,
  getServerPublicKey,
};
