import amqplib, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { config } from './index';
import { logger } from '../utils/logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

// Queue names
export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  EMAILS: 'emails',
  AI_TASKS: 'ai_tasks',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
};

export const initializeRabbitMQ = async (): Promise<void> => {
  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

    // Assert queues
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
        },
      });
    }

    logger.info('✅ RabbitMQ connected and queues asserted');

    // Handle connection errors
    connection.on('error', (error) => {
      logger.error('❌ RabbitMQ connection error:', error);
    });

    connection.on('close', () => {
      logger.warn('⚠️ RabbitMQ connection closed');
    });
  } catch (error) {
    logger.error('❌ Failed to connect to RabbitMQ:', error);
    // Don't throw - allow app to run without RabbitMQ
  }
};

// Publish message to queue
export const publishToQueue = async (
  queue: string,
  message: any
): Promise<boolean> => {
  try {
    if (!channel) {
      logger.warn('RabbitMQ channel not available');
      return false;
    }

    const buffer = Buffer.from(JSON.stringify(message));
    return channel.sendToQueue(queue, buffer, {
      persistent: true,
      contentType: 'application/json',
    });
  } catch (error) {
    logger.error(`Failed to publish to queue ${queue}:`, error);
    return false;
  }
};

// Consume messages from queue
export const consumeFromQueue = async (
  queue: string,
  callback: (message: any) => Promise<void>
): Promise<void> => {
  try {
    if (!channel) {
      logger.warn('RabbitMQ channel not available');
      return;
    }

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            channel?.ack(msg);
          } catch (error) {
            logger.error(`Error processing message from ${queue}:`, error);
            channel?.nack(msg, false, false); // Don't requeue
          }
        }
      },
      { noAck: false }
    );

    logger.info(`Consuming from queue: ${queue}`);
  } catch (error) {
    logger.error(`Failed to consume from queue ${queue}:`, error);
  }
};

// Queue task helpers
export const queueService = {
  // Queue notification
  async queueNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }): Promise<boolean> {
    return publishToQueue(QUEUES.NOTIFICATIONS, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  // Queue email
  async queueEmail(data: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }): Promise<boolean> {
    return publishToQueue(QUEUES.EMAILS, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  // Queue AI task
  async queueAITask(data: {
    type: string;
    studentId: string;
    payload: any;
  }): Promise<boolean> {
    return publishToQueue(QUEUES.AI_TASKS, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  // Queue report generation
  async queueReport(data: {
    type: string;
    studentId: string;
    period: { start: Date; end: Date };
  }): Promise<boolean> {
    return publishToQueue(QUEUES.REPORTS, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  // Queue analytics event
  async queueAnalytics(data: {
    event: string;
    userId?: string;
    studentId?: string;
    data: any;
  }): Promise<boolean> {
    return publishToQueue(QUEUES.ANALYTICS, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
};

// Close connection
export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};

export default {
  initializeRabbitMQ,
  publishToQueue,
  consumeFromQueue,
  queueService,
  closeRabbitMQ,
  QUEUES,
};
