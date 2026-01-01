/**
 * E2E Encryption Middleware
 * Automatically handles encrypted requests and responses
 */

import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../services/encryption.service';

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
 * Middleware to decrypt incoming encrypted requests
 */
export function decryptRequest(req: EncryptedRequest, res: Response, next: NextFunction) {
  try {
    // Check if request is encrypted
    if (req.body?.encrypted && req.body?.payload) {
      console.log('🔐 Processing encrypted request...');
      
      // Store client public key for response encryption
      req.clientPublicKey = req.body.payload.publicKey;
      req.isEncrypted = true;
      
      // Store original encrypted body
      req.originalBody = req.body;
      
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
 * Middleware to encrypt outgoing responses
 */
export function encryptResponse(req: EncryptedRequest, res: Response, next: NextFunction) {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method
  res.json = function(data: any) {
    // Only encrypt if the request was encrypted and we have the client's public key
    if (req.isEncrypted && req.clientPublicKey) {
      try {
        console.log('🔐 Encrypting response...');
        
        const encryptedResponse = encryptionService.createEncryptedResponse(
          data,
          req.clientPublicKey
        );
        
        console.log('✅ Response encrypted successfully');
        return originalJson(encryptedResponse);
      } catch (error) {
        console.error('❌ Response encryption failed:', error);
        // Fall through to unencrypted response
      }
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Combined middleware for encryption
 */
export function e2eEncryption(req: EncryptedRequest, res: Response, next: NextFunction) {
  // First set up response encryption
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (req.isEncrypted && req.clientPublicKey) {
      try {
        const encryptedResponse = encryptionService.createEncryptedResponse(
          data,
          req.clientPublicKey
        );
        return originalJson(encryptedResponse);
      } catch (error) {
        console.error('Response encryption failed:', error);
      }
    }
    return originalJson(data);
  };
  
  // Then decrypt request if needed
  try {
    if (req.body?.encrypted && req.body?.payload) {
      req.clientPublicKey = req.body.payload.publicKey;
      req.isEncrypted = true;
      req.originalBody = req.body;
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
    
    if (!clientPublicKey) {
      return res.status(400).json({
        success: false,
        message: 'Client public key is required',
        code: 'MISSING_PUBLIC_KEY',
      });
    }
    
    // Register client's public key (optional, for session tracking)
    // encryptionService.registerClientKey(clientId, clientPublicKey);
    
    // Return server's public key
    const serverPublicKey = encryptionService.getPublicKey();
    
    res.status(200).json({
      success: true,
      message: 'Handshake successful',
      data: {
        serverPublicKey,
        // Optionally include a session ID or other metadata
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Handshake failed:', error);
    res.status(500).json({
      success: false,
      message: 'Handshake failed',
      code: 'HANDSHAKE_ERROR',
    });
  }
}

/**
 * Get server's public key (for clients that need it)
 */
export function getServerPublicKey(req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: {
      publicKey: encryptionService.getPublicKey(),
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
