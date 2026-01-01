import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Doubt, DoubtStatus } from '../entities/Doubt';
import { Student } from '../entities/Student';
import { authenticate, AuthRequest } from '../middlewares/auth';
import aiService from '../services/ai.service';

const router = Router();

/**
 * @route   POST /api/v1/doubts
 * @desc    Create a new doubt
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, question, doubtType = 'text', imageUrl, voiceUrl } = req.body;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    const studentRepository = AppDataSource.getRepository(Student);

    // Get student info for AI context
    const student = await studentRepository.findOne({
      where: { id: studentId },
      relations: ['class', 'board'],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Create doubt
    const doubt = doubtRepository.create({
      studentId,
      topicId,
      question,
      doubtType,
      imageUrl,
      voiceUrl,
      status: DoubtStatus.PENDING,
    });

    await doubtRepository.save(doubt);

    // Get AI answer
    try {
      const aiAnswer = await aiService.resolveDoubt({
        studentName: student.studentName,
        grade: student.class?.displayName || 'Student',
        subject: 'General', // Would come from topic relation
        topic: topicId,
        question,
      });

      doubt.aiAnswer = aiAnswer;
      doubt.status = DoubtStatus.AI_ANSWERED;
      await doubtRepository.save(doubt);
    } catch (aiError) {
      // If AI fails, doubt remains pending
      console.error('AI doubt resolution failed:', aiError);
    }

    res.status(201).json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/doubts
 * @desc    Get doubts for a student
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, topicId, status, page = 1, limit = 20 } = req.query;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    
    const query: any = {};
    if (studentId) query.studentId = studentId;
    if (topicId) query.topicId = topicId;
    if (status) query.status = status;

    const [doubts, total] = await doubtRepository.findAndCount({
      where: query,
      relations: ['topic'],
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: doubts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
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
    const { id } = req.params;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    const doubt = await doubtRepository.findOne({
      where: { id },
      relations: ['topic', 'student'],
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
    const { id } = req.params;
    const { rating, feedback } = req.body;

    const doubtRepository = AppDataSource.getRepository(Doubt);
    
    await doubtRepository.update(id, {
      isResolved: true,
      status: DoubtStatus.RESOLVED,
      resolvedAt: new Date(),
      rating,
      feedback,
    });

    const doubt = await doubtRepository.findOne({ where: { id } });

    res.json({ success: true, data: doubt });
  } catch (error) {
    next(error);
  }
});

export default router;
