import 'reflect-metadata';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeRabbitMQ } from './config/rabbitmq';
import { config } from './config';
import { logger } from './utils/logger';

const PORT = config.port;

async function startServer() {
  try {
    // Initialize Database
    logger.info('🔌 Connecting to PostgreSQL...');
    await initializeDatabase();

    // Initialize Redis
    logger.info('🔌 Connecting to Redis...');
    await initializeRedis();

    // Initialize RabbitMQ
    logger.info('🔌 Connecting to RabbitMQ...');
    await initializeRabbitMQ();

    // Create HTTP Server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      logger.info(`🔗 Socket connected: ${socket.id}`);

      // Join room based on user ID
      socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`👤 User ${userId} joined room`);
      });

      // Join student room
      socket.on('joinStudent', (studentId: string) => {
        socket.join(`student:${studentId}`);
        logger.info(`🎓 Student ${studentId} joined room`);
      });

      // Learning session events
      socket.on('startSession', (data) => {
        socket.join(`session:${data.sessionId}`);
        logger.info(`📚 Session started: ${data.sessionId}`);
      });

      socket.on('endSession', (data) => {
        socket.leave(`session:${data.sessionId}`);
        logger.info(`📕 Session ended: ${data.sessionId}`);
      });

      // Typing indicator
      socket.on('typing', (data) => {
        socket.to(`session:${data.sessionId}`).emit('userTyping', data);
      });

      // Chat message
      socket.on('message', (data) => {
        io.to(`session:${data.sessionId}`).emit('newMessage', data);
      });

      socket.on('disconnect', () => {
        logger.info(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

    // Make io accessible in routes
    app.set('io', io);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 AI Tutor API Server is running!                       ║
║                                                            ║
║   📡 HTTP Server:  http://localhost:${PORT}                   ║
║   🔌 WebSocket:    ws://localhost:${PORT}                     ║
║   📝 API Version:  ${config.apiVersion}                              ║
║   🌍 Environment:  ${config.nodeEnv}                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} signal received. Closing server...`);
      
      httpServer.close(async () => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
