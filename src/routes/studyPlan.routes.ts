import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { StudyPlan, PlanStatus } from '../entities/StudyPlan';
import { StudyPlanItem, ItemStatus } from '../entities/StudyPlanItem';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/v1/study-plans/generate
 * @desc    Generate AI study plan
 * @access  Private
 */
router.post('/generate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, startDate, endDate, dailyHours, targetSubjects, targetExam } = req.body;

    const studyPlanRepository = AppDataSource.getRepository(StudyPlan);
    const plan = studyPlanRepository.create({
      studentId,
      planTitle: `Study Plan - ${new Date(startDate).toLocaleDateString()}`,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyHours: dailyHours || 2,
      targetSubjects,
      targetExam,
      status: PlanStatus.ACTIVE,
      isAiGenerated: true,
    });

    await studyPlanRepository.save(plan);

    // TODO: Generate plan items using AI

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/study-plans
 * @desc    Get student's study plans
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, status } = req.query;

    const studyPlanRepository = AppDataSource.getRepository(StudyPlan);
    const query: any = {};
    
    if (studentId) query.studentId = studentId;
    if (status) query.status = status;

    const plans = await studyPlanRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/study-plans/:id
 * @desc    Get study plan with items
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studyPlanRepository = AppDataSource.getRepository(StudyPlan);
    const plan = await studyPlanRepository.findOne({
      where: { id: req.params.id },
      relations: ['items', 'items.topic'],
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/study-plans/:id/today
 * @desc    Get today's study items
 * @access  Private
 */
router.get('/:id/today', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemRepository = AppDataSource.getRepository(StudyPlanItem);
    const items = await itemRepository.find({
      where: { 
        studyPlanId: req.params.id,
        scheduledDate: today,
      },
      relations: ['topic'],
      order: { displayOrder: 'ASC' },
    });

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/study-plans/items/:itemId/complete
 * @desc    Mark study item as complete
 * @access  Private
 */
router.put('/items/:itemId/complete', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const itemRepository = AppDataSource.getRepository(StudyPlanItem);
    
    await itemRepository.update(req.params.itemId, {
      status: ItemStatus.COMPLETED,
      completedAt: new Date(),
    });

    const item = await itemRepository.findOne({ where: { id: req.params.itemId } });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
