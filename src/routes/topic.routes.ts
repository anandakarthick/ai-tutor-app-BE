import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Topic } from '../entities/Topic';
import { ContentBlock } from '../entities/ContentBlock';

const router = Router();

router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { chapterId } = req.query;
    const topicRepository = AppDataSource.getRepository(Topic);
    
    const query: any = { isActive: true };
    if (chapterId) query.chapterId = chapterId;

    const topics = await topicRepository.find({
      where: query,
      order: { displayOrder: 'ASC' },
    });

    res.json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const topicRepository = AppDataSource.getRepository(Topic);
    const topic = await topicRepository.findOne({
      where: { id: req.params.id },
      relations: ['contentBlocks', 'quizzes'],
    });

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/content', async (req, res: Response, next: NextFunction) => {
  try {
    const contentBlockRepository = AppDataSource.getRepository(ContentBlock);
    const contentBlocks = await contentBlockRepository.find({
      where: { topicId: req.params.id, isActive: true },
      order: { sequenceOrder: 'ASC' },
    });

    res.json({ success: true, data: contentBlocks });
  } catch (error) {
    next(error);
  }
});

export default router;
