import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Topic } from '../entities/Topic';
import { ContentBlock } from '../entities/ContentBlock';
import { StudentProgress } from '../entities/StudentProgress';
import { authenticate, AuthRequest, optionalAuth } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/topics
 * @desc    Get topics by chapter with optional student progress
 * @access  Public (with optional auth for progress)
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chapterId, studentId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ success: false, message: 'chapterId is required' });
    }

    // If studentId provided, get topics with progress
    if (studentId) {
      const topicRepository = AppDataSource.getRepository(Topic);
      const progressRepository = AppDataSource.getRepository(StudentProgress);
      
      // Get topics
      const topics = await topicRepository.find({
        where: { chapterId: chapterId as string, isActive: true },
        order: { displayOrder: 'ASC' },
      });

      // Get student progress for these topics
      const progressRecords = await progressRepository.find({
        where: { studentId: studentId as string },
      });

      // Create progress map
      const progressMap = new Map<string, StudentProgress>();
      progressRecords.forEach(p => progressMap.set(p.topicId, p));

      // Add progress info to topics
      const topicsWithProgress = topics.map(topic => {
        const progress = progressMap.get(topic.id);
        const progressPercent = progress ? Number(progress.progressPercentage) : 0;
        return {
          ...topic,
          estimatedDuration: topic.estimatedDurationMinutes,
          isCompleted: progressPercent >= 100 || !!progress?.completedAt,
          progress: progressPercent,
          completedAt: progress?.completedAt || null,
        };
      });

      return res.json({ success: true, data: topicsWithProgress });
    }

    // No studentId - return cached topics without progress
    const cacheKey = `topics:${chapterId}`;
    const cached = await cacheService.get<Topic[]>(cacheKey);
    if (cached) {
      const topicsWithDefaults = cached.map(t => ({
        ...t,
        estimatedDuration: t.estimatedDurationMinutes,
        isCompleted: false,
        progress: 0,
      }));
      return res.json({ success: true, data: topicsWithDefaults, cached: true });
    }

    const topicRepository = AppDataSource.getRepository(Topic);
    const topics = await topicRepository.find({
      where: { chapterId: chapterId as string, isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, topics, 3600);

    const topicsWithDefaults = topics.map(t => ({
      ...t,
      estimatedDuration: t.estimatedDurationMinutes,
      isCompleted: false,
      progress: 0,
    }));

    res.json({ success: true, data: topicsWithDefaults });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/topics/:id
 * @desc    Get topic by ID
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get<Topic>(`topic:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const topicRepository = AppDataSource.getRepository(Topic);
    const topic = await topicRepository.findOne({
      where: { id, isActive: true },
      relations: ['chapter', 'chapter.book', 'chapter.book.subject'],
    });

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    await cacheService.set(`topic:${id}`, topic, 3600);

    res.json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/topics/:id/content
 * @desc    Get topic content blocks
 * @access  Private
 */
router.get('/:id/content', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cacheKey = `topic:${id}:content`;
    const cached = await cacheService.get<ContentBlock[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const contentRepository = AppDataSource.getRepository(ContentBlock);
    const content = await contentRepository.find({
      where: { topicId: id, isActive: true },
      order: { sequenceOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, content, 3600);

    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

export default router;
