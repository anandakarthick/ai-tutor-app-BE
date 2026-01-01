import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Subject } from '../entities/Subject';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/subjects
 * @desc    Get subjects by class
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { classId, medium } = req.query;
    
    const subjectRepository = AppDataSource.getRepository(Subject);
    const query: any = { isActive: true };
    
    if (classId) query.classId = classId;
    if (medium) query.medium = medium;

    const subjects = await subjectRepository.find({
      where: query,
      order: { displayOrder: 'ASC', subjectName: 'ASC' },
    });

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
    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id: req.params.id },
      relations: ['books'],
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
});

export default router;
