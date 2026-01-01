import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Doubt, DoubtStatus, DoubtType } from '../entities/Doubt';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/v1/doubts
 * @desc    Submit a doubt
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, question, doubtType = 'text', imageUrl, voiceUrl } = req.body;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    const doubt = doubtRepository.create({
      studentId,
      topicId,
      question,
      doubtType: doubtType as DoubtType,
      imageUrl,
      voiceUrl,
      status: DoubtStatus.PENDING,
    });

    await doubtRepository.save(doubt);

    // TODO: Send to AI for answer

    res.status(201).json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/doubts
 * @desc    Get student's doubts
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, status, topicId } = req.query;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    const query: any = {};
    
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;
    if (topicId) query.topicId = topicId;

    const doubts = await doubtRepository.find({
      where: query,
      relations: ['topic'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    res.json({ success: true, data: doubts });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/doubts/:id
 * @desc    Get doubt by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doubtRepository = AppDataSource.getRepository(Doubt);
    const doubt = await doubtRepository.findOne({
      where: { id: req.params.id },
      relations: ['topic'],
    });

    if (!doubt) {
      return res.status(404).json({ success: false, message: 'Doubt not found' });
    }

    res.json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/doubts/:id/resolve
 * @desc    Mark doubt as resolved
 * @access  Private
 */
router.put('/:id/resolve', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rating, feedback } = req.body;
    const doubtRepository = AppDataSource.getRepository(Doubt);

    await doubtRepository.update(req.params.id, {
      isResolved: true,
      status: DoubtStatus.RESOLVED,
      resolvedAt: new Date(),
      rating,
      feedback,
    });

    const doubt = await doubtRepository.findOne({ where: { id: req.params.id } });
    res.json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
});

export default router;
