import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../entities/Notification';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { queueService } from '../config/rabbitmq';

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

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send notification (Admin/System)
 * @access  Private
 */
router.post('/send', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, type, title, message, data } = req.body;

    // Queue notification for processing
    await queueService.queueNotification({
      userId,
      type: type || NotificationType.SYSTEM,
      title,
      message,
      data,
    });

    res.json({ success: true, message: 'Notification queued for delivery' });
  } catch (error) {
    next(error);
  }
});

export default router;
