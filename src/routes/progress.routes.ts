import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { StudentProgress } from '../entities/StudentProgress';
import { DailyProgress } from '../entities/DailyProgress';
import { Student } from '../entities/Student';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/progress/:studentId
 * @desc    Get student's overall progress
 * @access  Private
 */
router.get('/:studentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;

    // Check cache
    const cacheKey = `progress:${studentId}:overall`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    const progress = await progressRepository.find({
      where: { studentId },
      relations: ['topic', 'topic.chapter', 'topic.chapter.book', 'topic.chapter.book.subject'],
    });

    // Aggregate by subject
    const subjectProgress: Record<string, any> = {};
    for (const p of progress) {
      const subjectId = p.topic?.chapter?.book?.subject?.id;
      if (!subjectId) continue;

      if (!subjectProgress[subjectId]) {
        subjectProgress[subjectId] = {
          subjectId,
          subjectName: p.topic.chapter.book.subject.subjectName,
          totalTopics: 0,
          completedTopics: 0,
          totalTimeMinutes: 0,
          avgProgress: 0,
        };
      }

      subjectProgress[subjectId].totalTopics++;
      subjectProgress[subjectId].totalTimeMinutes += p.totalTimeSpentMinutes;
      subjectProgress[subjectId].avgProgress += p.progressPercentage;
      
      if (p.progressPercentage === 100) {
        subjectProgress[subjectId].completedTopics++;
      }
    }

    // Calculate averages
    Object.values(subjectProgress).forEach((s: any) => {
      s.avgProgress = s.totalTopics > 0 ? s.avgProgress / s.totalTopics : 0;
    });

    const result = {
      totalTopics: progress.length,
      completedTopics: progress.filter(p => p.progressPercentage === 100).length,
      totalTimeMinutes: progress.reduce((sum, p) => sum + p.totalTimeSpentMinutes, 0),
      subjectProgress: Object.values(subjectProgress),
    };

    // Cache for 1 hour
    await cacheService.set(cacheKey, result, 3600);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/progress/:studentId/daily
 * @desc    Get daily progress history
 * @access  Private
 */
router.get('/:studentId/daily', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const dailyRepository = AppDataSource.getRepository(DailyProgress);
    const dailyProgress = await dailyRepository
      .createQueryBuilder('dp')
      .where('dp.student_id = :studentId', { studentId })
      .andWhere('dp.date >= :startDate', { startDate })
      .orderBy('dp.date', 'ASC')
      .getMany();

    res.json({ success: true, data: dailyProgress });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/progress/:studentId/daily
 * @desc    Record daily progress
 * @access  Private
 */
router.post('/:studentId/daily', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { 
      studyTimeMinutes, 
      topicsCompleted, 
      quizzesAttempted, 
      doubtsAsked, 
      xpEarned,
      subjectWiseTime,
    } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRepository = AppDataSource.getRepository(DailyProgress);
    let daily = await dailyRepository.findOne({
      where: { studentId, date: today },
    });

    if (!daily) {
      // Get previous streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayProgress = await dailyRepository.findOne({
        where: { studentId, date: yesterday },
      });

      daily = dailyRepository.create({
        studentId,
        date: today,
        streakDays: yesterdayProgress ? yesterdayProgress.streakDays + 1 : 1,
      });
    }

    daily.totalStudyTimeMinutes += studyTimeMinutes || 0;
    daily.topicsCompleted += topicsCompleted || 0;
    daily.quizzesAttempted += quizzesAttempted || 0;
    daily.doubtsAsked += doubtsAsked || 0;
    daily.xpEarned += xpEarned || 0;

    if (subjectWiseTime) {
      daily.subjectWiseTime = {
        ...daily.subjectWiseTime,
        ...subjectWiseTime,
      };
    }

    await dailyRepository.save(daily);

    // Update student streak
    const studentRepository = AppDataSource.getRepository(Student);
    await studentRepository.update(studentId, {
      streakDays: daily.streakDays,
      lastActivityDate: today,
    });

    // Invalidate cache
    await cacheService.del(`progress:${studentId}:overall`);

    res.json({ success: true, data: daily });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/progress/:studentId/streak
 * @desc    Get student's streak info
 * @access  Private
 */
router.get('/:studentId/streak', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id: studentId },
      select: ['id', 'streakDays', 'lastActivityDate', 'xp', 'level'],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if streak is still active
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivity = student.lastActivityDate ? new Date(student.lastActivityDate) : null;
    const isStreakActive = lastActivity && 
      (today.getTime() - lastActivity.getTime()) <= 24 * 60 * 60 * 1000;

    res.json({
      success: true,
      data: {
        streakDays: isStreakActive ? student.streakDays : 0,
        lastActivityDate: student.lastActivityDate,
        isStreakActive,
        xp: student.xp,
        level: student.level,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
