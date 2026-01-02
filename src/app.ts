import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
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

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AI Tutor API is healthy',
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    environment: config.nodeEnv,
  });
});

// API Routes
const apiPrefix = `/api/${config.apiVersion}`;

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

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
