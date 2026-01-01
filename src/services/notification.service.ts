import admin from 'firebase-admin';
import { config } from '../config';
import { logger } from '../utils/logger';
import AppDataSource from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../entities/Notification';
import { User } from '../entities/User';

// Firebase Admin SDK initialization
let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Requires service account credentials
 */
export const initializeFirebase = (): void => {
  if (firebaseApp) {
    logger.info('Firebase already initialized');
    return;
  }

  try {
    // Check if we have the required credentials
    if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
      logger.warn('⚠️ Firebase credentials not configured. Push notifications will be disabled.');
      return;
    }

    // Initialize with service account credentials
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
      }),
    });

    logger.info('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('❌ Firebase initialization failed:', error);
  }
};

// Initialize on module load
initializeFirebase();

/**
 * FCM V1 API Notification Payload Interface
 */
export interface FCMNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
}

/**
 * FCM V1 API Data Payload Interface
 */
export interface FCMDataPayload {
  [key: string]: string;
}

/**
 * FCM V1 API Android Config
 */
export interface FCMAndroidConfig {
  priority?: 'high' | 'normal';
  ttl?: string;
  collapseKey?: string;
  channelId?: string;
  icon?: string;
  color?: string;
  sound?: string;
  clickAction?: string;
}

/**
 * FCM V1 API iOS (APNS) Config
 */
export interface FCMApnsConfig {
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  contentAvailable?: boolean;
  mutableContent?: boolean;
}

/**
 * Complete FCM Message Options
 */
export interface FCMMessageOptions {
  notification: FCMNotificationPayload;
  data?: FCMDataPayload;
  android?: FCMAndroidConfig;
  apns?: FCMApnsConfig;
}

/**
 * Firebase Cloud Messaging Service using V1 API
 */
export class FCMService {
  private messaging: admin.messaging.Messaging | null = null;

  constructor() {
    if (firebaseApp) {
      this.messaging = admin.messaging(firebaseApp);
    }
  }

  /**
   * Check if FCM is available
   */
  isAvailable(): boolean {
    return this.messaging !== null;
  }

  /**
   * Build Android notification config for FCM V1 API
   */
  private buildAndroidConfig(
    notification: FCMNotificationPayload,
    androidConfig?: FCMAndroidConfig
  ): admin.messaging.AndroidConfig {
    return {
      priority: androidConfig?.priority || 'high',
      ttl: androidConfig?.ttl ? parseInt(androidConfig.ttl) * 1000 : 3600000,
      collapseKey: androidConfig?.collapseKey,
      notification: {
        channelId: androidConfig?.channelId || 'ai_tutor_default',
        icon: androidConfig?.icon || 'ic_notification',
        color: androidConfig?.color || '#F97316',
        sound: androidConfig?.sound || 'default',
        clickAction: androidConfig?.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    };
  }

  /**
   * Build APNS (iOS) notification config for FCM V1 API
   */
  private buildApnsConfig(
    notification: FCMNotificationPayload,
    apnsConfig?: FCMApnsConfig
  ): admin.messaging.ApnsConfig {
    return {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body,
          },
          badge: apnsConfig?.badge ?? 1,
          sound: apnsConfig?.sound || 'default',
          category: apnsConfig?.category,
          threadId: apnsConfig?.threadId,
          contentAvailable: apnsConfig?.contentAvailable,
          mutableContent: apnsConfig?.mutableContent ?? true,
        },
      },
      fcmOptions: {
        imageUrl: notification.imageUrl,
      },
    };
  }

  /**
   * Send notification to a single device using FCM V1 API
   */
  async sendToDevice(
    fcmToken: string,
    options: FCMMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.messaging) {
      logger.warn('FCM not available - Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: options.notification.title,
          body: options.notification.body,
          imageUrl: options.notification.imageUrl,
        },
        data: options.data,
        android: this.buildAndroidConfig(options.notification, options.android),
        apns: this.buildApnsConfig(options.notification, options.apns),
        webpush: {
          notification: {
            title: options.notification.title,
            body: options.notification.body,
            icon: '/icon-192x192.png',
          },
          fcmOptions: {
            link: options.data?.actionUrl,
          },
        },
      };

      const response = await this.messaging.send(message);
      
      logger.info(`✅ FCM notification sent successfully. Message ID: ${response}`);
      return { success: true, messageId: response };
    } catch (error: any) {
      logger.error('❌ FCM send error:', error);

      if (error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'Token not registered - device may have uninstalled the app' };
      }
      if (error.code === 'messaging/invalid-registration-token') {
        return { success: false, error: 'Invalid FCM token format' };
      }
      if (error.code === 'messaging/invalid-argument') {
        return { success: false, error: 'Invalid message payload' };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple devices using FCM V1 API
   */
  async sendToDevices(
    fcmTokens: string[],
    options: FCMMessageOptions
  ): Promise<{ successCount: number; failureCount: number; responses: any[] }> {
    if (!this.messaging) {
      logger.warn('FCM not available - Firebase not initialized');
      return { successCount: 0, failureCount: fcmTokens.length, responses: [] };
    }

    if (fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: options.notification.title,
          body: options.notification.body,
          imageUrl: options.notification.imageUrl,
        },
        data: options.data,
        android: this.buildAndroidConfig(options.notification, options.android),
        apns: this.buildApnsConfig(options.notification, options.apns),
      };

      const response = await this.messaging.sendEachForMulticast(message);

      logger.info(`📤 FCM multicast: ${response.successCount} success, ${response.failureCount} failed`);

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
      };
    } catch (error: any) {
      logger.error('❌ FCM multicast error:', error);
      return { successCount: 0, failureCount: fcmTokens.length, responses: [] };
    }
  }

  /**
   * Send notification to a topic using FCM V1 API
   */
  async sendToTopic(
    topic: string,
    options: FCMMessageOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.messaging) {
      logger.warn('FCM not available - Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        topic: topic,
        notification: {
          title: options.notification.title,
          body: options.notification.body,
          imageUrl: options.notification.imageUrl,
        },
        data: options.data,
        android: this.buildAndroidConfig(options.notification, options.android),
        apns: this.buildApnsConfig(options.notification, options.apns),
      };

      const response = await this.messaging.send(message);
      
      logger.info(`✅ FCM topic notification sent to '${topic}'. Message ID: ${response}`);
      return { success: true, messageId: response };
    } catch (error: any) {
      logger.error(`❌ FCM topic send error for '${topic}':`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe device tokens to a topic
   */
  async subscribeToTopic(
    fcmTokens: string[],
    topic: string
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.messaging) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const response = await this.messaging.subscribeToTopic(fcmTokens, topic);
      logger.info(`📥 Subscribed ${response.successCount} devices to topic '${topic}'`);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      logger.error(`❌ Topic subscription error for '${topic}':`, error);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   */
  async unsubscribeFromTopic(
    fcmTokens: string[],
    topic: string
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.messaging) {
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(fcmTokens, topic);
      logger.info(`📤 Unsubscribed ${response.successCount} devices from topic '${topic}'`);
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      logger.error(`❌ Topic unsubscription error for '${topic}':`, error);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }
}

// Export singleton instance
export const fcmService = new FCMService();

/**
 * Complete Notification Service
 */
export class NotificationService {
  private fcm: FCMService;

  constructor() {
    this.fcm = fcmService;
  }

  /**
   * Create notification in database and optionally send push
   */
  async createAndSend(data: {
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

    if (data.sendPush !== false) {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: data.userId },
        select: ['id', 'fcmToken'],
      });

      if (user?.fcmToken) {
        const result = await this.fcm.sendToDevice(user.fcmToken, {
          notification: {
            title: data.title,
            body: data.message,
            imageUrl: data.imageUrl,
          },
          data: {
            notificationId: notification.id,
            type: data.type,
            actionUrl: data.actionUrl || '',
            ...Object.fromEntries(
              Object.entries(data.data || {}).map(([k, v]) => [k, String(v)])
            ),
          },
          android: {
            channelId: this.getChannelIdForType(data.type),
            priority: data.priority === NotificationPriority.HIGH ? 'high' : 'normal',
          },
        });

        if (result.success) {
          notification.isPushSent = true;
          notification.pushSentAt = new Date();
          await notificationRepository.save(notification);
        }
      }
    }

    return notification;
  }

  private getChannelIdForType(type: NotificationType): string {
    const channelMap: Record<NotificationType, string> = {
      [NotificationType.SYSTEM]: 'ai_tutor_system',
      [NotificationType.REMINDER]: 'ai_tutor_reminders',
      [NotificationType.ACHIEVEMENT]: 'ai_tutor_achievements',
      [NotificationType.QUIZ]: 'ai_tutor_quiz',
      [NotificationType.SUBSCRIPTION]: 'ai_tutor_subscription',
      [NotificationType.STREAK]: 'ai_tutor_streak',
      [NotificationType.PROMOTION]: 'ai_tutor_promotions',
      [NotificationType.UPDATE]: 'ai_tutor_updates',
    };
    return channelMap[type] || 'ai_tutor_default';
  }

  async sendStudyReminder(userId: string, studentName: string): Promise<void> {
    await this.createAndSend({
      userId,
      type: NotificationType.REMINDER,
      title: '📚 Time to Study!',
      message: `Hey ${studentName}! Ready to continue your learning journey?`,
      data: { screen: 'Dashboard' },
    });
  }

  async sendStreakReminder(userId: string, streakDays: number): Promise<void> {
    await this.createAndSend({
      userId,
      type: NotificationType.STREAK,
      title: '🔥 Keep Your Streak Alive!',
      message: `You're on a ${streakDays}-day streak! Don't break it now.`,
      priority: NotificationPriority.HIGH,
      data: { screen: 'Dashboard' },
    });
  }

  async sendAchievementNotification(
    userId: string,
    achievementName: string,
    xpReward: number
  ): Promise<void> {
    await this.createAndSend({
      userId,
      type: NotificationType.ACHIEVEMENT,
      title: '🏆 Achievement Unlocked!',
      message: `Congratulations! You earned "${achievementName}" and +${xpReward} XP!`,
      priority: NotificationPriority.HIGH,
      data: { screen: 'Achievements' },
    });
  }

  async sendQuizResultNotification(
    userId: string,
    quizTitle: string,
    score: number,
    passed: boolean
  ): Promise<void> {
    await this.createAndSend({
      userId,
      type: NotificationType.QUIZ,
      title: passed ? '🎉 Quiz Completed!' : '📝 Quiz Finished',
      message: `You scored ${score}% on "${quizTitle}". ${passed ? 'Great job!' : 'Keep practicing!'}`,
      data: { screen: 'QuizResults' },
    });
  }

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

    await this.createAndSend({
      userId,
      type: NotificationType.SUBSCRIPTION,
      title: type === 'activated' ? '✅ Subscription Activated' : '⚠️ Subscription Alert',
      message: messages[type],
      priority: type === 'activated' ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
      data: { screen: 'Subscription' },
    });
  }

  async sendBroadcast(
    title: string,
    message: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string }> {
    return this.fcm.sendToTopic('all_users', {
      notification: { title, body: message },
      data,
    });
  }
}

export default new NotificationService();
