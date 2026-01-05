import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Student } from '../entities/Student';
import { StudentProgress } from '../entities/StudentProgress';
import { DailyProgress } from '../entities/DailyProgress';
import { LearningSession } from '../entities/LearningSession';
import { QuizAttempt, AttemptStatus } from '../entities/QuizAttempt';
import { StudyPlan, PlanStatus } from '../entities/StudyPlan';
import { StudyPlanItem } from '../entities/StudyPlanItem';
import { Achievement } from '../entities/Achievement';
import { StudentAchievement } from '../entities/StudentAchievement';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    console.log(`[Dashboard API] Getting stats for student: ${studentId}`);

    // Check cache - short TTL for dashboard
    const cacheKey = `dashboard:stats:${studentId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`[Dashboard API] Returning cached stats`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Get student with all relevant info
    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id: studentId as string },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get today's progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRepository = AppDataSource.getRepository(DailyProgress);
    const todayProgress = await dailyRepository.findOne({
      where: { studentId: studentId as string, date: today },
    });

    console.log(`[Dashboard API] Today's progress:`, todayProgress);

    // Get total topics progress
    const progressRepository = AppDataSource.getRepository(StudentProgress);
    const progressCount = await progressRepository
      .createQueryBuilder('p')
      .where('p.student_id = :studentId', { studentId })
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN p.progress_percentage >= 100 OR p.completed_at IS NOT NULL THEN 1 ELSE 0 END)', 'completed')
      .getRawOne();

    console.log(`[Dashboard API] Progress count:`, progressCount);

    // Get quiz stats - Count only SUBMITTED or EVALUATED attempts
    const quizRepository = AppDataSource.getRepository(QuizAttempt);
    const quizStats = await quizRepository
      .createQueryBuilder('q')
      .where('q.student_id = :studentId', { studentId })
      .andWhere('q.status IN (:...statuses)', { 
        statuses: [AttemptStatus.SUBMITTED, AttemptStatus.EVALUATED] 
      })
      .select('COUNT(*)', 'total')
      .addSelect('AVG(q.percentage)', 'avgScore')
      .addSelect('MAX(q.percentage)', 'bestScore')
      .addSelect('SUM(CASE WHEN q.is_passed = true THEN 1 ELSE 0 END)', 'passed')
      .getRawOne();

    console.log(`[Dashboard API] Quiz stats:`, quizStats);

    // Get achievements count
    const achievementRepository = AppDataSource.getRepository(StudentAchievement);
    const achievementsCount = await achievementRepository.count({
      where: { studentId: studentId as string },
    });

    const stats = {
      student: {
        name: student.studentName,
        xp: student.xp || 0,
        level: student.level || 1,
        streakDays: student.streakDays || 0,
      },
      today: {
        studyTimeMinutes: todayProgress?.totalStudyTimeMinutes || 0,
        topicsCompleted: todayProgress?.topicsCompleted || 0,
        xpEarned: todayProgress?.xpEarned || 0,
        goalAchieved: todayProgress?.goalAchieved || false,
      },
      overall: {
        totalTopics: parseInt(progressCount?.total || '0'),
        completedTopics: parseInt(progressCount?.completed || '0'),
        totalQuizzes: parseInt(quizStats?.total || '0'),
        avgQuizScore: Math.round(parseFloat(quizStats?.avgScore || '0') * 100) / 100,
        bestQuizScore: Math.round(parseFloat(quizStats?.bestScore || '0') * 100) / 100,
        quizzesPassed: parseInt(quizStats?.passed || '0'),
        achievements: achievementsCount,
      },
    };

    console.log(`[Dashboard API] Final stats:`, JSON.stringify(stats, null, 2));

    // Cache for 2 minutes
    await cacheService.set(cacheKey, stats, 120);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Dashboard API] Stats error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/dashboard/today
 * @desc    Get today's study plan
 * @access  Private
 */
router.get('/today', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    console.log(`[Dashboard API] Getting today's plan for student: ${studentId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active study plan
    const planRepository = AppDataSource.getRepository(StudyPlan);
    const activePlan = await planRepository.findOne({
      where: { 
        studentId: studentId as string,
        status: PlanStatus.ACTIVE,
      },
    });

    let todayItems: StudyPlanItem[] = [];
    if (activePlan) {
      const itemRepository = AppDataSource.getRepository(StudyPlanItem);
      todayItems = await itemRepository.find({
        where: {
          studyPlanId: activePlan.id,
          scheduledDate: today,
        },
        relations: ['topic', 'topic.chapter', 'topic.chapter.book', 'topic.chapter.book.subject'],
        order: { displayOrder: 'ASC' },
      });
    }

    // Get continue learning (last incomplete session)
    const sessionRepository = AppDataSource.getRepository(LearningSession);
    const lastSession = await sessionRepository.findOne({
      where: { 
        studentId: studentId as string,
      },
      relations: ['topic', 'topic.chapter', 'topic.chapter.book'],
      order: { createdAt: 'DESC' },
    });

    res.json({
      success: true,
      data: {
        studyPlan: activePlan,
        todayItems,
        continueLearning: lastSession,
      },
    });
  } catch (error) {
    console.error('[Dashboard API] Today error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/dashboard/leaderboard
 * @desc    Get leaderboard
 * @access  Private
 */
router.get('/leaderboard', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, type = 'weekly', limit = 10 } = req.query;

    console.log(`[Dashboard API] Getting leaderboard, classId: ${classId}, type: ${type}`);

    // Try cache first
    const cacheKey = `leaderboard:${classId || 'global'}:${type}`;
    const cached = await cacheService.zrevrangeWithScores(cacheKey, 0, Number(limit) - 1);
    
    if (cached && cached.length > 0) {
      console.log(`[Dashboard API] Returning cached leaderboard`);
      return res.json({ success: true, data: cached, cached: true });
    }

    // Calculate from database
    const studentRepository = AppDataSource.getRepository(Student);
    const query = studentRepository
      .createQueryBuilder('s')
      .select(['s.id', 's.studentName', 's.xp', 's.level', 's.streakDays', 's.profileImageUrl'])
      .where('s.is_active = true')
      .orderBy('s.xp', 'DESC')
      .limit(Number(limit));

    if (classId) {
      query.andWhere('s.class_id = :classId', { classId });
    }

    const students = await query.getMany();

    const leaderboard = students.map((s, index) => ({
      rank: index + 1,
      studentId: s.id,
      name: s.studentName,
      xp: s.xp || 0,
      level: s.level || 1,
      streak: s.streakDays || 0,
      avatar: s.profileImageUrl,
    }));

    console.log(`[Dashboard API] Leaderboard:`, leaderboard.length, 'students');

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('[Dashboard API] Leaderboard error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/dashboard/achievements
 * @desc    Get student achievements
 * @access  Private
 */
router.get('/achievements', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    console.log(`[Dashboard API] Getting achievements for student: ${studentId}`);

    // Get earned achievements
    const studentAchievementRepository = AppDataSource.getRepository(StudentAchievement);
    const earned = await studentAchievementRepository.find({
      where: { studentId: studentId as string },
      relations: ['achievement'],
      order: { earnedAt: 'DESC' },
    });

    // Get all achievements for comparison
    const achievementRepository = AppDataSource.getRepository(Achievement);
    const allAchievements = await achievementRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });

    const earnedIds = earned.map(e => e.achievementId);
    const locked = allAchievements.filter(a => !earnedIds.includes(a.id));

    res.json({
      success: true,
      data: {
        earned: earned.map(e => ({
          ...e.achievement,
          earnedAt: e.earnedAt,
        })),
        locked,
        total: allAchievements.length,
        earnedCount: earned.length,
      },
    });
  } catch (error) {
    console.error('[Dashboard API] Achievements error:', error);
    next(error);
  }
});

export default router;
