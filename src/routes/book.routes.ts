import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Book } from '../entities/Book';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/books
 * @desc    Get books by subject
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }

    const cacheKey = `books:${subjectId}`;
    const cached = await cacheService.get<Book[]>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const bookRepository = AppDataSource.getRepository(Book);
    const books = await bookRepository.find({
      where: { subjectId: subjectId as string, isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await cacheService.set(cacheKey, books, 3600);

    res.json({ success: true, data: books });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/books/:id
 * @desc    Get book by ID with chapters
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get<Book>(`book:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const bookRepository = AppDataSource.getRepository(Book);
    const book = await bookRepository.findOne({
      where: { id, isActive: true },
      relations: ['chapters'],
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    await cacheService.set(`book:${id}`, book, 3600);

    res.json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
});

export default router;
