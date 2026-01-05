import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'ai_tutor_db',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // E2E Encryption
  encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true',
  encryptionSecretKey: process.env.ENCRYPTION_SECRET_KEY || '',

  // Claude AI (Anthropic)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  // Firebase Cloud Messaging (FCM V1 API)
  firebase: {
    // Service Account credentials
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    
    // Optional: Path to service account JSON file
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    
    // FCM Sender ID (from Firebase Console)
    senderId: process.env.FIREBASE_SENDER_ID || '599635702008',
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },

  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'ai-tutor-uploads',
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001', // Web app dev
    'http://localhost:5173', // Vite dev
    'http://localhost:8080', // Alternative web
    'http://localhost:8081', // React Native
  ],

  // Web App Configuration
  web: {
    enabled: process.env.WEB_ENABLED !== 'false', // Enable by default
    cookieSecret: process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production',
    cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
    cookieSecure: process.env.NODE_ENV === 'production', // HTTPS only in production
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    csrfEnabled: process.env.CSRF_ENABLED === 'true', // Enable CSRF protection for web
  },

  // Client Type Detection
  clients: {
    mobile: ['ios', 'android', 'react-native'],
    web: ['web', 'browser'],
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};

export default config;
