import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Book } from '../entities/Book';

const router = Router();

router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.query;
    const bookRepository = AppDataSource.getRepository(Book);
    
    const query: any = { isActive: true };
    if (subjectId) query.subjectId = subjectId;

    const books = await bookRepository.find({
      where: query,
      order: { displayOrder: 'ASC' },
    });

    res.json({ success: true, data: books });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const bookRepository = AppDataSource.getRepository(Book);
    const book = await bookRepository.findOne({
      where: { id: req.params.id },
      relations: ['chapters'],
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
});

export default router;
