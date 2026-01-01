import 'reflect-metadata';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import AppDataSource from './config/database';
import { initializeRedis } from './config/redis';
import { initializeRabbitMQ } from './config/rabbitmq';
import { config } from './config';
import { logger } from './utils/logger';

const PORT = config.port;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join user to their personal room
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined their room`);
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
  });

  socket.on('endSession', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
    logger.info(`Learning session ended: ${sessionId}`);
  });

  // Handle chat messages
  socket.on('typing', (data: { sessionId: string; isTyping: boolean }) => {
    socket.to(`session:${data.sessionId}`).emit('userTyping', data);
  });

  socket.on('message', (data: { sessionId: string; message: any }) => {
    io.to(`session:${data.sessionId}`).emit('newMessage', data.message);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

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
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
      logger.info(`🔌 Socket.IO ready for connections`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
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
