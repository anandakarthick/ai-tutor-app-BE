import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';

import { config } from './config';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { decryptRequest, encryptResponse } from './middlewares/encryption';
import { detectClientType, ClientType } from './middlewares/clientDetection';
import { logger, stream } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import studentRoutes from './routes/student.routes';
import boardRoutes from './routes/board.routes';
import subjectRoutes from './routes/subject.routes';
import bookRoutes from './routes/book.routes';
import chapterRoutes from './routes/chapter.routes';
import topicRoutes from './routes/topic.routes';
import learningRoutes from './routes/learning.routes';
import doubtRoutes from './routes/doubt.routes';
import quizRoutes from './routes/quiz.routes';
import studyPlanRoutes from './routes/studyPlan.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import progressRoutes from './routes/progress.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';

const app: Application = express();

// Trust proxy for production (behind nginx/load balancer)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware with web-compatible CSP
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:", ...config.corsOrigins],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  } : false, // Disable CSP in development for easier debugging
  crossOriginEmbedderPolicy: false, // Required for some web features
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
}));

// CORS configuration - Support both mobile and web clients
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // In production, check against whitelist
    if (config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Encryption-Enabled',
    'X-Client-Public-Key',
    'X-Client-Type',      // New: Identify client type (web/mobile)
    'X-Client-Version',   // New: Client app version
    'X-CSRF-Token',       // New: CSRF token for web
  ],
  exposedHeaders: [
    'X-Encryption-Enabled',
    'X-CSRF-Token',
    'Set-Cookie',
  ],
  credentials: true, // Important for cookies
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Cookie parser for web session management
app.use(cookieParser(config.web.cookieSecret));

// Compression
app.use(compression());

// Body parser with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Client type detection middleware
app.use(detectClientType);

// Rate limiting - Different limits for web vs mobile
const createRateLimiter = (maxRequests: number) => rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted clients or in development
  skip: (req) => config.nodeEnv === 'development',
});

if (config.nodeEnv === 'production') {
  // Standard rate limit for API
  app.use('/api', createRateLimiter(config.rateLimitMaxRequests));
} else {
  // Development: Much higher limits
  app.use('/api', createRateLimiter(10000));
  console.log('🔓 Development mode: Rate limiting relaxed (10000 req/15min)');
}

// Serve static files for web app (if built and deployed alongside API)
if (config.web.enabled) {
  const webBuildPath = path.join(__dirname, '../public');
  app.use(express.static(webBuildPath));
  console.log('🌐 Web support enabled');
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (no encryption)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AI Tutor API is healthy',
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    environment: config.nodeEnv,
    encryption: config.encryptionEnabled ? 'enabled' : 'disabled',
    webSupport: config.web.enabled,
    clientTypes: ['mobile', 'web'],
  });
});

// API prefix
const apiPrefix = `/api/${config.apiVersion}`;

// Apply E2E encryption middleware to all API routes
// Note: Encryption is optional for web clients (controlled via X-Encryption-Enabled header)
if (config.encryptionEnabled) {
  console.log('🔐 E2E Encryption available for API routes');
  app.use(apiPrefix, encryptResponse);
  app.use(apiPrefix, decryptRequest);
} else {
  console.log('🔓 E2E Encryption disabled');
}

// API Routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/students`, studentRoutes);
app.use(`${apiPrefix}/boards`, boardRoutes);
app.use(`${apiPrefix}/subjects`, subjectRoutes);
app.use(`${apiPrefix}/books`, bookRoutes);
app.use(`${apiPrefix}/chapters`, chapterRoutes);
app.use(`${apiPrefix}/topics`, topicRoutes);
app.use(`${apiPrefix}/learning`, learningRoutes);
app.use(`${apiPrefix}/doubts`, doubtRoutes);
app.use(`${apiPrefix}/quizzes`, quizRoutes);
app.use(`${apiPrefix}/study-plans`, studyPlanRoutes);
app.use(`${apiPrefix}/subscriptions`, subscriptionRoutes);
app.use(`${apiPrefix}/payments`, paymentRoutes);
app.use(`${apiPrefix}/progress`, progressRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
app.use(`${apiPrefix}/settings`, settingsRoutes);

// Serve web app for any non-API routes (SPA fallback)
if (config.web.enabled) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    
    const indexPath = path.join(__dirname, '../public/index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        // If no web build exists, continue to 404 handler
        next();
      }
    });
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
