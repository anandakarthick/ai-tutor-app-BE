import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Chapter } from '../entities/Chapter';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/chapters
 * @desc    Get chapters by book
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { bookId } = req.query;

    if (!bookId) {
      return res.status(400).json({ success: false, message: 'bookId is required' });
    }

    const cacheKey = `chapters:${bookId}`;
    const cached = await cacheService.get<Chapter[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapters = await chapterRepository.find({
      where: { bookId: bookId as string, isActive: true },
      order: { chapterNumber: 'ASC' },
    });

    await cacheService.set(cacheKey, chapters, 3600);

    res.json({ success: true, data: chapters });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/chapters/:id
 * @desc    Get chapter by ID with topics
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get<Chapter>(`chapter:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapter = await chapterRepository.findOne({
      where: { id, isActive: true },
      relations: ['topics'],
    });

    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }

    await cacheService.set(`chapter:${id}`, chapter, 3600);

    res.json({ success: true, data: chapter });
  } catch (error) {
    next(error);
  }
});

export default router;
