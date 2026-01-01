import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Board } from '../entities/Board';
import { Class } from '../entities/Class';
import { authenticate, AuthRequest } from '../middlewares/auth';
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
      order: { displayOrder: 'ASC' },
    });

    // Cache for 1 hour
    await cacheService.set('boards:all', boards, 3600);

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
    const { id } = req.params;

    // Try cache first
    const cached = await cacheService.get<Board>(`board:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const boardRepository = AppDataSource.getRepository(Board);
    const board = await boardRepository.findOne({
      where: { id, isActive: true },
    });

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    // Cache for 1 hour
    await cacheService.set(`board:${id}`, board, 3600);

    res.json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/boards/:id/classes
 * @desc    Get classes by board
 * @access  Public
 */
router.get('/:id/classes', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await cacheService.get<Class[]>(`board:${id}:classes`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const classRepository = AppDataSource.getRepository(Class);
    const classes = await classRepository.find({
      where: { boardId: id, isActive: true },
      order: { displayOrder: 'ASC' },
    });

    // Cache for 1 hour
    await cacheService.set(`board:${id}:classes`, classes, 3600);

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
});

export default router;
