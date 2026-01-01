import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../entities/Notification';
import { User } from '../entities/User';
import { authenticate, AuthRequest, authorize } from '../middlewares/auth';
import { UserRole } from '../entities/User';
import notificationService, { fcmService } from '../services/notification.service';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const notificationRepository = AppDataSource.getRepository(Notification);
    const query: any = { userId: req.user!.userId };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, total] = await notificationRepository.findAndCount({
      where: query,
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    const count = await notificationRepository.count({
      where: { userId: req.user!.userId, isRead: false },
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    await notificationRepository.update(
      { id: req.params.id, userId: req.user!.userId },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    await notificationRepository.update(
      { userId: req.user!.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notificationRepository = AppDataSource.getRepository(Notification);
    
    await notificationRepository.delete({
      id: req.params.id,
      userId: req.user!.userId,
    });

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

// ==================== FCM Push Notification Routes ====================

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send push notification to a specific user
 * @access  Private (Admin only)
 */
router.post('/send', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, title, message, type = 'system', data, imageUrl } = req.body;

    if (!userId || !title || !message) {
      throw new AppError('userId, title, and message are required', 400, 'MISSING_FIELDS');
    }

    const notification = await notificationService.createAndSend({
      userId,
      type: type as NotificationType,
      title,
      message,
      data,
      imageUrl,
      sendPush: true,
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/send-to-token
 * @desc    Send push notification directly to FCM token (for testing)
 * @access  Private (Admin only)
 */
router.post('/send-to-token', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fcmToken, title, body, data, imageUrl, channelId } = req.body;

    if (!fcmToken || !title || !body) {
      throw new AppError('fcmToken, title, and body are required', 400, 'MISSING_FIELDS');
    }

    const result = await fcmService.sendToDevice(fcmToken, {
      notification: {
        title,
        body,
        imageUrl,
      },
      data: data || {},
      android: {
        channelId: channelId || 'ai_tutor_default',
        priority: 'high',
      },
    });

    res.json({
      success: result.success,
      message: result.success ? 'Push notification sent' : 'Failed to send notification',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/send-to-topic
 * @desc    Send push notification to a topic
 * @access  Private (Admin only)
 */
router.post('/send-to-topic', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topic, title, body, data, imageUrl } = req.body;

    if (!topic || !title || !body) {
      throw new AppError('topic, title, and body are required', 400, 'MISSING_FIELDS');
    }

    const result = await fcmService.sendToTopic(topic, {
      notification: {
        title,
        body,
        imageUrl,
      },
      data: data || {},
    });

    res.json({
      success: result.success,
      message: result.success ? `Notification sent to topic: ${topic}` : 'Failed to send notification',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/broadcast
 * @desc    Send push notification to all users
 * @access  Private (Admin only)
 */
router.post('/broadcast', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, body, data, imageUrl } = req.body;

    if (!title || !body) {
      throw new AppError('title and body are required', 400, 'MISSING_FIELDS');
    }

    const result = await notificationService.sendBroadcast(title, body, data);

    res.json({
      success: result.success,
      message: result.success ? 'Broadcast notification sent' : 'Failed to send broadcast',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/subscribe
 * @desc    Subscribe user's FCM token to topics
 * @access  Private
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      throw new AppError('topics array is required', 400, 'MISSING_TOPICS');
    }

    // Get user's FCM token
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'fcmToken'],
    });

    if (!user?.fcmToken) {
      throw new AppError('No FCM token registered for this user', 400, 'NO_FCM_TOKEN');
    }

    const results: { topic: string; success: boolean }[] = [];

    for (const topic of topics) {
      const result = await fcmService.subscribeToTopic([user.fcmToken], topic);
      results.push({
        topic,
        success: result.successCount > 0,
      });
    }

    res.json({
      success: true,
      message: 'Topic subscription processed',
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/unsubscribe
 * @desc    Unsubscribe user's FCM token from topics
 * @access  Private
 */
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      throw new AppError('topics array is required', 400, 'MISSING_TOPICS');
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'fcmToken'],
    });

    if (!user?.fcmToken) {
      throw new AppError('No FCM token registered for this user', 400, 'NO_FCM_TOKEN');
    }

    const results: { topic: string; success: boolean }[] = [];

    for (const topic of topics) {
      const result = await fcmService.unsubscribeFromTopic([user.fcmToken], topic);
      results.push({
        topic,
        success: result.successCount > 0,
      });
    }

    res.json({
      success: true,
      message: 'Topic unsubscription processed',
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/test
 * @desc    Send test notification to current user
 * @access  Private
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'fcmToken', 'fullName'],
    });

    if (!user?.fcmToken) {
      throw new AppError('No FCM token registered. Please update your FCM token first.', 400, 'NO_FCM_TOKEN');
    }

    const result = await fcmService.sendToDevice(user.fcmToken, {
      notification: {
        title: '🎉 Test Notification',
        body: `Hello ${user.fullName}! This is a test notification from AI Tutor.`,
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      android: {
        channelId: 'ai_tutor_default',
        priority: 'high',
      },
    });

    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/notifications/fcm-status
 * @desc    Check FCM service status
 * @access  Private (Admin only)
 */
router.get('/fcm-status', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAvailable = fcmService.isAvailable();

    res.json({
      success: true,
      data: {
        fcmAvailable: isAvailable,
        message: isAvailable 
          ? 'Firebase Cloud Messaging is properly configured and available'
          : 'Firebase Cloud Messaging is not available. Check your Firebase configuration.',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
