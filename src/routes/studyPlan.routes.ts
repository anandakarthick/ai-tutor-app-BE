import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { StudyPlan, PlanStatus } from '../entities/StudyPlan';
import { StudyPlanItem, ItemStatus } from '../entities/StudyPlanItem';
import { Topic } from '../entities/Topic';
import { Chapter } from '../entities/Chapter';
import { Book } from '../entities/Book';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { In } from 'typeorm';

const router = Router();

/**
 * @route   POST /api/v1/study-plans/generate
 * @desc    Generate AI study plan with items
 * @access  Private
 */
router.post('/generate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, startDate, endDate, dailyHours = 2, targetSubjects, targetExam } = req.body;

    console.log('[StudyPlan] Generating plan for student:', studentId);
    console.log('[StudyPlan] Params:', { startDate, endDate, dailyHours, targetSubjects, targetExam });

    const studyPlanRepository = AppDataSource.getRepository(StudyPlan);
    const studyPlanItemRepository = AppDataSource.getRepository(StudyPlanItem);
    const topicRepository = AppDataSource.getRepository(Topic);

    // Create the study plan
    const plan = studyPlanRepository.create({
      studentId,
      planTitle: targetExam ? `${targetExam} Preparation Plan` : `Study Plan - ${new Date(startDate).toLocaleDateString()}`,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyHours: dailyHours,
      targetSubjects,
      targetExam,
      status: PlanStatus.ACTIVE,
      isAiGenerated: true,
    });

    await studyPlanRepository.save(plan);
    console.log('[StudyPlan] Created plan:', plan.id);

    // Get topics to schedule
    let topics: Topic[] = [];
    
    if (targetSubjects && targetSubjects.length > 0) {
      // Get topics from selected subjects
      const bookRepository = AppDataSource.getRepository(Book);
      const chapterRepository = AppDataSource.getRepository(Chapter);
      
      const books = await bookRepository.find({
        where: { subjectId: In(targetSubjects) },
      });
      
      if (books.length > 0) {
        const chapters = await chapterRepository.find({
          where: { bookId: In(books.map(b => b.id)) },
        });
        
        if (chapters.length > 0) {
          topics = await topicRepository.find({
            where: { chapterId: In(chapters.map(c => c.id)) },
            relations: ['chapter', 'chapter.book', 'chapter.book.subject'],
            take: 50, // Limit to 50 topics
          });
        }
      }
    } else {
      // Get all available topics
      topics = await topicRepository.find({
        relations: ['chapter', 'chapter.book', 'chapter.book.subject'],
        take: 50,
      });
    }

    console.log('[StudyPlan] Found topics:', topics.length);

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calculate topics per day
    const topicsPerDay = Math.ceil(topics.length / daysDiff) || 1;
    const minutesPerTopic = Math.floor((dailyHours * 60) / topicsPerDay) || 30;

    console.log('[StudyPlan] Schedule:', { daysDiff, topicsPerDay, minutesPerTopic });

    // Create study plan items
    const items: StudyPlanItem[] = [];
    let currentDate = new Date(start);
    let topicIndex = 0;
    let displayOrder = 0;

    while (topicIndex < topics.length && currentDate <= end) {
      // Schedule topics for this day
      for (let i = 0; i < topicsPerDay && topicIndex < topics.length; i++) {
        const topic = topics[topicIndex];
        
        const item = studyPlanItemRepository.create({
          studyPlanId: plan.id,
          topicId: topic.id,
          scheduledDate: new Date(currentDate),
          estimatedMinutes: minutesPerTopic,
          displayOrder: displayOrder++,
          status: ItemStatus.PENDING,
        });
        
        items.push(item);
        topicIndex++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Save all items
    if (items.length > 0) {
      await studyPlanItemRepository.save(items);
      console.log('[StudyPlan] Created items:', items.length);
    }

    // Reload plan with items
    const fullPlan = await studyPlanRepository.findOne({
      where: { id: plan.id },
      relations: ['items', 'items.topic', 'items.topic.chapter', 'items.topic.chapter.book', 'items.topic.chapter.book.subject'],
    });

    res.status(201).json({ success: true, data: fullPlan });
  } catch (error) {
    console.error('[StudyPlan] Generate error:', error);
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
      relations: ['items', 'items.topic', 'items.topic.chapter', 'items.topic.chapter.book', 'items.topic.chapter.book.subject'],
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found' });
    }

    // Sort items by scheduled date and display order
    if (plan.items) {
      plan.items.sort((a, b) => {
        const dateA = new Date(a.scheduledDate).getTime();
        const dateB = new Date(b.scheduledDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.displayOrder - b.displayOrder;
      });
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
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const itemRepository = AppDataSource.getRepository(StudyPlanItem);
    const items = await itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.topic', 'topic')
      .leftJoinAndSelect('topic.chapter', 'chapter')
      .leftJoinAndSelect('chapter.book', 'book')
      .leftJoinAndSelect('book.subject', 'subject')
      .where('item.studyPlanId = :planId', { planId: req.params.id })
      .andWhere('item.scheduledDate >= :today', { today })
      .andWhere('item.scheduledDate < :tomorrow', { tomorrow })
      .orderBy('item.displayOrder', 'ASC')
      .getMany();

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

    const item = await itemRepository.findOne({ 
      where: { id: req.params.itemId },
      relations: ['topic'],
    });
    
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/study-plans/:id
 * @desc    Delete a study plan
 * @access  Private
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studyPlanRepository = AppDataSource.getRepository(StudyPlan);
    const studyPlanItemRepository = AppDataSource.getRepository(StudyPlanItem);

    // Delete all items first
    await studyPlanItemRepository.delete({ studyPlanId: req.params.id });
    
    // Delete the plan
    await studyPlanRepository.delete(req.params.id);

    res.json({ success: true, message: 'Study plan deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
