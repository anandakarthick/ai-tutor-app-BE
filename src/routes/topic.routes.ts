import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Topic } from '../entities/Topic';
import { ContentBlock } from '../entities/ContentBlock';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/topics
 * @desc    Get topics by chapter
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { chapterId } = req.query;

    if (!chapterId) {
      return res.status(400).json({ success: false, message: 'chapterId is required' });
    }

    const cacheKey = `topics:${chapterId}`;
    const cached = await cacheService.get<Topic[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const topicRepository = AppDataSource.getRepository(Topic);
    const topics = await topicRepository.find({
      where: { chapterId: chapterId as string, isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, topics, 3600);

    res.json({ success: true, data: topics });
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
