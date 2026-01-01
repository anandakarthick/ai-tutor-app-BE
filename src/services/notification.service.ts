import admin from 'firebase-admin';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppDataSource } from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../entities/Notification';
import { User } from '../entities/User';

// Initialize Firebase Admin
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
      firebaseInitialized = true;
      logger.info('✅ Firebase Admin initialized');
    } catch (error) {
      logger.error('❌ Firebase Admin initialization failed:', error);
    }
  } else {
    logger.warn('⚠️ Firebase credentials not configured');
  }
};

initializeFirebase();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class NotificationService {
  /**
   * Send push notification to a single device
   */
  async sendToDevice(fcmToken: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!firebaseInitialized) {
      logger.warn('Firebase not initialized, skipping push notification');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'ai_tutor_channel',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      logger.info(`Push notification sent to device`);
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/registration-token-not-registered') {
        logger.warn('FCM token is invalid or expired');
      } else {
        logger.error('Push notification failed:', error);
      }
      return false;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(fcmTokens: string[], payload: PushNotificationPayload): Promise<number> {
    if (!firebaseInitialized || fcmTokens.length === 0) {
      return 0;
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'ai_tutor_channel',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`Push notifications sent: ${response.successCount}/${fcmTokens.length}`);
      return response.successCount;
    } catch (error) {
      logger.error('Multicast push notification failed:', error);
      return 0;
    }
  }

  /**
   * Send push notification to topic subscribers
   */
  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!firebaseInitialized) {
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
      };

      await admin.messaging().send(message);
      logger.info(`Push notification sent to topic: ${topic}`);
      return true;
    } catch (error) {
      logger.error('Topic push notification failed:', error);
      return false;
    }
  }

  /**
   * Create and store notification in database
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    data?: Record<string, any>;
    imageUrl?: string;
    actionUrl?: string;
    sendPush?: boolean;
  }): Promise<Notification> {
    const notificationRepository = AppDataSource.getRepository(Notification);

    const notification = notificationRepository.create({
      userId: data.userId,
      notificationType: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || NotificationPriority.MEDIUM,
      data: data.data,
      imageUrl: data.imageUrl,
      actionUrl: data.actionUrl,
    });

    await notificationRepository.save(notification);

    // Send push notification if requested
    if (data.sendPush !== false) {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: data.userId },
        select: ['id', 'fcmToken'],
      });

      if (user?.fcmToken) {
        const sent = await this.sendToDevice(user.fcmToken, {
          title: data.title,
          body: data.message,
          data: {
            notificationId: notification.id,
            type: data.type,
            ...data.data,
          },
          imageUrl: data.imageUrl,
        });

        if (sent) {
          notification.isPushSent = true;
          notification.pushSentAt = new Date();
          await notificationRepository.save(notification);
        }
      }
    }

    return notification;
  }

  /**
   * Send study reminder
   */
  async sendStudyReminder(userId: string, studentName: string): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.REMINDER,
      title: '📚 Time to Study!',
      message: `Hey ${studentName}! Ready to continue your learning journey?`,
      data: { screen: 'Dashboard' },
    });
  }

  /**
   * Send streak reminder
   */
  async sendStreakReminder(userId: string, streakDays: number): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.STREAK,
      title: '🔥 Keep Your Streak Alive!',
      message: `You're on a ${streakDays}-day streak! Don't break it now.`,
      priority: NotificationPriority.HIGH,
      data: { screen: 'Dashboard' },
    });
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(
    userId: string,
    achievementName: string,
    xpReward: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.ACHIEVEMENT,
      title: '🏆 Achievement Unlocked!',
      message: `Congratulations! You earned "${achievementName}" and +${xpReward} XP!`,
      priority: NotificationPriority.HIGH,
      data: { screen: 'Achievements' },
    });
  }

  /**
   * Send quiz result notification
   */
  async sendQuizResultNotification(
    userId: string,
    quizTitle: string,
    score: number,
    passed: boolean
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.QUIZ,
      title: passed ? '🎉 Quiz Completed!' : '📝 Quiz Finished',
      message: `You scored ${score}% on "${quizTitle}". ${passed ? 'Great job!' : 'Keep practicing!'}`,
      data: { screen: 'QuizResults' },
    });
  }

  /**
   * Send subscription notification
   */
  async sendSubscriptionNotification(
    userId: string,
    type: 'activated' | 'expiring' | 'expired',
    planName: string,
    daysLeft?: number
  ): Promise<void> {
    const messages = {
      activated: `Your ${planName} subscription is now active! Enjoy learning!`,
      expiring: `Your ${planName} subscription expires in ${daysLeft} days. Renew now!`,
      expired: `Your ${planName} subscription has expired. Renew to continue learning!`,
    };

    await this.createNotification({
      userId,
      type: NotificationType.SUBSCRIPTION,
      title: type === 'activated' ? '✅ Subscription Activated' : '⚠️ Subscription Alert',
      message: messages[type],
      priority: type === 'activated' ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
      data: { screen: 'Subscription' },
    });
  }
}

export default new NotificationService();
