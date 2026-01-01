import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Subject } from '../entities/Subject';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';
import { Medium } from '../entities/enums';

const router = Router();

/**
 * @route   GET /api/v1/subjects
 * @desc    Get subjects by class
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { classId, medium = 'english' } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    const cacheKey = `subjects:${classId}:${medium}`;
    const cached = await cacheService.get<Subject[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subjects = await subjectRepository.find({
      where: { 
        classId: classId as string, 
        medium: medium as Medium,
        isActive: true 
      },
      order: { displayOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, subjects, 3600);

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/subjects/:id
 * @desc    Get subject by ID
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get<Subject>(`subject:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id, isActive: true },
      relations: ['books'],
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    await cacheService.set(`subject:${id}`, subject, 3600);

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
});

export default router;
