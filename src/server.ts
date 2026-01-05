import 'reflect-metadata';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app';
import AppDataSource from './config/database';
import { initializeRedis } from './config/redis';
import { initializeRabbitMQ } from './config/rabbitmq';
import { config } from './config';
import { logger } from './utils/logger';

const PORT = config.port;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with enhanced web support
const io = new Server(server, {
  cors: {
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
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Authorization', 'X-Client-Type'],
  },
  // Transport options for better web compatibility
  transports: ['websocket', 'polling'],
  // Allow upgrades from polling to websocket
  allowUpgrades: true,
  // Ping configuration
  pingTimeout: 60000,
  pingInterval: 25000,
  // Cookie configuration for web clients
  cookie: config.web.enabled ? {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  } : false,
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    // Get token from auth header, query, or handshake
    let token = socket.handshake.auth?.token;
    
    if (!token && socket.handshake.query?.token) {
      token = socket.handshake.query.token as string;
    }
    
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization as string;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      // Allow unauthenticated connections for public features
      logger.info(`Socket connected without auth: ${socket.id}`);
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    socket.data.user = decoded;
    socket.data.userId = decoded.userId;
    
    logger.info(`Socket authenticated: ${socket.id} (User: ${decoded.userId})`);
    next();
  } catch (error: any) {
    logger.warn(`Socket auth failed: ${socket.id} - ${error.message}`);
    // Allow connection but without user data
    next();
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const clientType = socket.handshake.headers['x-client-type'] || 'unknown';
  const userId = socket.data.userId;
  
  logger.info(`Socket connected: ${socket.id} (Client: ${clientType}, User: ${userId || 'anonymous'})`);

  // Auto-join user to their personal room if authenticated
  if (userId) {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} auto-joined their room`);
  }

  // Join user to their personal room (manual)
  socket.on('join', (userIdParam: string) => {
    socket.join(`user:${userIdParam}`);
    logger.info(`User ${userIdParam} joined their room`);
  });

  // Join student to their room
  socket.on('joinStudent', (studentId: string) => {
    socket.join(`student:${studentId}`);
    logger.info(`Student ${studentId} joined their room`);
  });

  // Handle learning session events
  socket.on('startSession', (data: { studentId: string; topicId: string; sessionId: string }) => {
    socket.join(`session:${data.sessionId}`);
    logger.info(`Learning session started: ${data.sessionId}`);
    
    // Notify others in the session
    socket.to(`session:${data.sessionId}`).emit('sessionStarted', {
      sessionId: data.sessionId,
      studentId: data.studentId,
      topicId: data.topicId,
    });
  });

  socket.on('endSession', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
    logger.info(`Learning session ended: ${sessionId}`);
    
    // Notify others
    socket.to(`session:${sessionId}`).emit('sessionEnded', { sessionId });
  });

  // Handle chat messages
  socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
    socket.to(`session:${data.sessionId}`).emit('userTyping', data);
  });

  socket.on('message', (data: { sessionId: string; message: any }) => {
    io.to(`session:${data.sessionId}`).emit('newMessage', data.message);
  });

  // Handle doubt chat events (for web)
  socket.on('joinDoubt', (doubtId: string) => {
    socket.join(`doubt:${doubtId}`);
    logger.info(`User joined doubt chat: ${doubtId}`);
  });

  socket.on('leaveDoubt', (doubtId: string) => {
    socket.leave(`doubt:${doubtId}`);
    logger.info(`User left doubt chat: ${doubtId}`);
  });

  socket.on('doubtMessage', (data: { doubtId: string; message: any }) => {
    io.to(`doubt:${data.doubtId}`).emit('newDoubtMessage', data.message);
  });

  // Handle quiz events (for real-time quizzes)
  socket.on('joinQuiz', (quizId: string) => {
    socket.join(`quiz:${quizId}`);
    logger.info(`User joined quiz room: ${quizId}`);
  });

  socket.on('leaveQuiz', (quizId: string) => {
    socket.leave(`quiz:${quizId}`);
    logger.info(`User left quiz room: ${quizId}`);
  });

  socket.on('quizAnswer', (data: { quizId: string; answer: any }) => {
    // Broadcast to quiz room (for live quizzes)
    socket.to(`quiz:${data.quizId}`).emit('answerSubmitted', {
      userId: socket.data.userId,
      answer: data.answer,
    });
  });

  // Handle presence/status updates (for web)
  socket.on('setStatus', (status: 'online' | 'away' | 'busy') => {
    if (socket.data.userId) {
      io.to(`user:${socket.data.userId}`).emit('statusChanged', {
        userId: socket.data.userId,
        status,
      });
    }
  });

  // Handle ping for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error: ${socket.id}`, error);
  });
});

// Make io accessible to routes
app.set('io', io);

// Helper to emit events from routes
export const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToStudent = (studentId: string, event: string, data: any) => {
  io.to(`student:${studentId}`).emit(event, data);
};

export const emitToSession = (sessionId: string, event: string, data: any) => {
  io.to(`session:${sessionId}`).emit(event, data);
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connection established');
    }

    // Connect to Redis (optional - continues if not available)
    try {
      await initializeRedis();
    } catch (redisError) {
      logger.warn('⚠️ Redis not available, continuing without caching');
    }

    // Connect to RabbitMQ (optional - continues if not available)
    try {
      await initializeRabbitMQ();
    } catch (rabbitError) {
      logger.warn('⚠️ RabbitMQ not available, continuing without message queuing');
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
      logger.info(`🔌 Socket.IO ready for connections`);
      logger.info(`📱 Mobile support: Enabled`);
      logger.info(`🌐 Web support: ${config.web.enabled ? 'Enabled' : 'Disabled'}`);
      logger.info(`🔐 E2E Encryption: ${config.encryptionEnabled ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close all socket connections
  io.close(() => {
    logger.info('Socket.IO server closed');
  });
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    }
    
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { io };
