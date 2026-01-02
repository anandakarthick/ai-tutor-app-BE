/**
 * E2E Encryption Service for Backend
 * Handles encryption/decryption of sensitive data
 */

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import crypto from 'crypto';
import { config } from '../config';

interface KeyPair {
  publicKey: string;
  secretKey: string;
}

interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  publicKey: string;
}

interface DecryptedRequest {
  encrypted: boolean;
  payload?: EncryptedPayload;
  [key: string]: any;
}

class EncryptionService {
  private serverKeyPair: nacl.BoxKeyPair;
  private clientPublicKeys: Map<string, Uint8Array> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Generate server key pair on startup
    this.serverKeyPair = this.loadOrGenerateKeyPair();
    this.isInitialized = true;
    
    if (config.encryptionEnabled) {
      console.log('🔐 Encryption service initialized');
      console.log('🔑 Server public key:', this.getPublicKey().substring(0, 20) + '...');
    } else {
      console.log('🔓 Encryption service initialized (encryption disabled)');
    }
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return config.encryptionEnabled && this.isInitialized;
  }

  /**
   * Load or generate server key pair
   */
  private loadOrGenerateKeyPair(): nacl.BoxKeyPair {
    // In production, load from environment variable
    const storedSecretKey = config.encryptionSecretKey;
    
    if (storedSecretKey) {
      try {
        const secretKey = naclUtil.decodeBase64(storedSecretKey);
        console.log('🔑 Loaded encryption key from environment');
        return nacl.box.keyPair.fromSecretKey(secretKey);
      } catch (error) {
        console.warn('⚠️ Failed to load stored key, generating new one');
      }
    }

    // Generate new key pair
    const keyPair = nacl.box.keyPair();
    
    // Log secret key for storing (only in development)
    if (config.nodeEnv === 'development') {
      console.log('⚠️ New encryption key generated. Add this to .env:');
      console.log('ENCRYPTION_SECRET_KEY=' + naclUtil.encodeBase64(keyPair.secretKey));
    }

    return keyPair;
  }

  /**
   * Get server's public key
   */
  getPublicKey(): string {
    return naclUtil.encodeBase64(this.serverKeyPair.publicKey);
  }

  /**
   * Register a client's public key
   */
  registerClientKey(clientId: string, publicKey: string): void {
    try {
      const keyBytes = naclUtil.decodeBase64(publicKey);
      this.clientPublicKeys.set(clientId, keyBytes);
      console.log(`🔐 Registered public key for client: ${clientId.substring(0, 8)}...`);
    } catch (error) {
      console.error('Failed to register client key:', error);
      throw new Error('Invalid public key format');
    }
  }

  /**
   * Encrypt data for a specific client
   */
  encryptForClient(clientId: string, data: any): EncryptedPayload {
    const clientPublicKey = this.clientPublicKeys.get(clientId);
    
    if (!clientPublicKey) {
      throw new Error('Client public key not registered');
    }

    const messageBytes = naclUtil.decodeUTF8(
      typeof data === 'string' ? data : JSON.stringify(data)
    );
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const ciphertext = nacl.box(
      messageBytes,
      nonce,
      clientPublicKey,
      this.serverKeyPair.secretKey
    );

    if (!ciphertext) {
      throw new Error('Encryption failed');
    }

    return {
      ciphertext: naclUtil.encodeBase64(ciphertext),
      nonce: naclUtil.encodeBase64(nonce),
      publicKey: this.getPublicKey(),
    };
  }

  /**
   * Encrypt data using sender's public key (from request)
   */
  encryptResponse(data: any, senderPublicKey: string): EncryptedPayload {
    const clientPublicKeyBytes = naclUtil.decodeBase64(senderPublicKey);
    
    const messageBytes = naclUtil.decodeUTF8(
      typeof data === 'string' ? data : JSON.stringify(data)
    );
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const ciphertext = nacl.box(
      messageBytes,
      nonce,
      clientPublicKeyBytes,
      this.serverKeyPair.secretKey
    );

    if (!ciphertext) {
      throw new Error('Encryption failed');
    }

    return {
      ciphertext: naclUtil.encodeBase64(ciphertext),
      nonce: naclUtil.encodeBase64(nonce),
      publicKey: this.getPublicKey(),
    };
  }

  /**
   * Decrypt incoming encrypted request
   */
  decryptRequest<T = any>(encryptedPayload: EncryptedPayload): T {
    const ciphertext = naclUtil.decodeBase64(encryptedPayload.ciphertext);
    const nonce = naclUtil.decodeBase64(encryptedPayload.nonce);
    const senderPublicKey = naclUtil.decodeBase64(encryptedPayload.publicKey);

    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      senderPublicKey,
      this.serverKeyPair.secretKey
    );

    if (!decrypted) {
      throw new Error('Decryption failed - invalid ciphertext or key');
    }

    const jsonString = naclUtil.encodeUTF8(decrypted);
    
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString as T;
    }
  }

  /**
   * Check if request is encrypted and decrypt if needed
   */
  processRequest<T = any>(body: DecryptedRequest): T {
    if (body.encrypted && body.payload) {
      return this.decryptRequest<T>(body.payload);
    }
    return body as T;
  }

  /**
   * Create encrypted response
   */
  createEncryptedResponse(data: any, clientPublicKey: string): {
    encrypted: true;
    payload: EncryptedPayload;
  } {
    const encryptedPayload = this.encryptResponse(data, clientPublicKey);
    return {
      encrypted: true,
      payload: encryptedPayload,
    };
  }

  /**
   * Hash a password or sensitive string
   */
  hash(data: string): string {
    return crypto.createHash('sha512').update(data).digest('base64');
  }

  /**
   * Generate random bytes
   */
  randomBytes(length: number): string {
    return naclUtil.encodeBase64(nacl.randomBytes(length));
  }

  /**
   * Symmetric encryption using a shared key
   */
  encryptSymmetric(data: string, key: Uint8Array): { ciphertext: string; nonce: string } {
    const messageBytes = naclUtil.decodeUTF8(data);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(messageBytes, nonce, key);

    return {
      ciphertext: naclUtil.encodeBase64(ciphertext),
      nonce: naclUtil.encodeBase64(nonce),
    };
  }

  /**
   * Symmetric decryption
   */
  decryptSymmetric(ciphertext: string, nonce: string, key: Uint8Array): string {
    const ciphertextBytes = naclUtil.decodeBase64(ciphertext);
    const nonceBytes = naclUtil.decodeBase64(nonce);
    const decrypted = nacl.secretbox.open(ciphertextBytes, nonceBytes, key);

    if (!decrypted) {
      throw new Error('Symmetric decryption failed');
    }

    return naclUtil.encodeUTF8(decrypted);
  }

  /**
   * Generate a session key
   */
  generateSessionKey(): string {
    return naclUtil.encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength));
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
export default encryptionService;
