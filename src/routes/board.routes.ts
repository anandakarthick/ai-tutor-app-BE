import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Board } from '../entities/Board';
import { Class } from '../entities/Class';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/boards
 * @desc    Get all boards
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    // Try cache first
    const cached = await cacheService.get<Board[]>('boards:all');
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const boardRepository = AppDataSource.getRepository(Board);
    const boards = await boardRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    // Cache for 24 hours
    await cacheService.set('boards:all', boards, 86400);

    res.json({ success: true, data: boards });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/boards/:id
 * @desc    Get board by ID
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const boardRepository = AppDataSource.getRepository(Board);
    const board = await boardRepository.findOne({
      where: { id: req.params.id, isActive: true },
    });

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    res.json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/boards/:id/classes
 * @desc    Get classes for a board
 * @access  Public
 */
router.get('/:id/classes', async (req, res: Response, next: NextFunction) => {
  try {
    const cacheKey = `boards:${req.params.id}:classes`;
    const cached = await cacheService.get<Class[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const classRepository = AppDataSource.getRepository(Class);
    const classes = await classRepository.find({
      where: { boardId: req.params.id, isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, classes, 86400);

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
});

export default router;
