import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Chapter } from '../entities/Chapter';

const router = Router();

router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { bookId } = req.query;
    const chapterRepository = AppDataSource.getRepository(Chapter);
    
    const query: any = { isActive: true };
    if (bookId) query.bookId = bookId;

    const chapters = await chapterRepository.find({
      where: query,
      order: { chapterNumber: 'ASC' },
    });

    res.json({ success: true, data: chapters });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapter = await chapterRepository.findOne({
      where: { id: req.params.id },
      relations: ['topics'],
    });

    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }

    res.json({ success: true, data: chapter });
  } catch (error) {
    next(error);
  }
});

export default router;
