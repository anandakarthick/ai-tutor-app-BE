import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { StudentProgress } from '../entities/StudentProgress';
import { DailyProgress } from '../entities/DailyProgress';
import { Student } from '../entities/Student';
import { Topic } from '../entities/Topic';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   DELETE /api/v1/progress/:studentId/cache
 * @desc    Clear progress cache for debugging
 * @access  Private
 */
router.delete('/:studentId/cache', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    
    await cacheService.del(`progress:${studentId}:overall`);
    await cacheService.del(`dashboard:stats:${studentId}`);
    
    console.log(`[Progress API] Cache cleared for student: ${studentId}`);
    
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('[Progress API] Cache clear error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/progress/:studentId
 * @desc    Get student's overall progress
 * @access  Private
 */
router.get('/:studentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { skipCache } = req.query;

    console.log(`[Progress API] Getting overall progress for student: ${studentId}, skipCache: ${skipCache}`);

    // Check cache unless skipCache is true
    if (skipCache !== 'true') {
      const cacheKey = `progress:${studentId}:overall`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`[Progress API] Returning cached progress`);
        return res.json({ success: true, data: cached, cached: true });
      }
    }

    // Get student with class info
    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id: studentId },
      relations: ['class'],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.classId) {
      return res.json({ 
        success: true, 
        data: {
          totalTopics: 0,
          completedTopics: 0,
          totalTimeMinutes: 0,
          subjectProgress: [],
        }
      });
    }

    // Get student's progress records
    const progressRepository = AppDataSource.getRepository(StudentProgress);
    const progress = await progressRepository.find({
      where: { studentId },
      relations: ['topic', 'topic.chapter', 'topic.chapter.book', 'topic.chapter.book.subject'],
    });

    console.log(`[Progress API] Found ${progress.length} progress records for student`);

    // Get all topics count per subject for this student's class
    const topicRepository = AppDataSource.getRepository(Topic);
    const subjectTopicCounts = await topicRepository
      .createQueryBuilder('t')
      .innerJoin('t.chapter', 'c')
      .innerJoin('c.book', 'b')
      .innerJoin('b.subject', 's')
      .where('s.classId = :classId', { classId: student.classId })
      .andWhere('t.isActive = true')
      .select('s.id', 'subjectId')
      .addSelect('s.display_name', 'subjectName')
      .addSelect('COUNT(t.id)', 'totalTopics')
      .groupBy('s.id')
      .addGroupBy('s.display_name')
      .getRawMany();

    console.log(`[Progress API] Subject topic counts from DB:`, JSON.stringify(subjectTopicCounts, null, 2));

    // Aggregate progress by subject
    const subjectProgress: Record<string, any> = {};
    
    // Initialize with all subjects (even those with no progress)
    for (const stc of subjectTopicCounts) {
      subjectProgress[stc.subjectId] = {
        subjectId: stc.subjectId,
        subjectName: stc.subjectName,
        totalTopics: parseInt(stc.totalTopics) || 0,
        completedTopics: 0,
        totalTimeMinutes: 0,
        avgProgress: 0,
      };
    }

    console.log(`[Progress API] Initialized ${Object.keys(subjectProgress).length} subjects`);

    // Add progress data from student's records
    for (const p of progress) {
      const subjectId = p.topic?.chapter?.book?.subject?.id;
      if (!subjectId) {
        console.log(`[Progress API] Skipping progress record - no subject ID found`);
        continue;
      }

      // Initialize if subject not found in topic counts (edge case)
      if (!subjectProgress[subjectId]) {
        console.log(`[Progress API] Subject ${subjectId} not in initial list, adding`);
        subjectProgress[subjectId] = {
          subjectId,
          subjectName: p.topic.chapter.book.subject.displayName,
          totalTopics: 0,
          completedTopics: 0,
          totalTimeMinutes: 0,
          avgProgress: 0,
        };
      }

      subjectProgress[subjectId].totalTimeMinutes += p.totalTimeSpentMinutes || 0;
      
      // Check if topic is completed (100% or has completedAt)
      const progressPercent = Number(p.progressPercentage) || 0;
      if (progressPercent >= 100 || p.completedAt) {
        subjectProgress[subjectId].completedTopics++;
        console.log(`[Progress API] Subject ${subjectProgress[subjectId].subjectName}: topic completed, now ${subjectProgress[subjectId].completedTopics} completed`);
      }
    }

    // Calculate average progress for each subject
    const subjectProgressArray = Object.values(subjectProgress).map((s: any) => {
      // Calculate average progress based on completed topics vs total topics
      let avgProgress = 0;
      if (s.totalTopics > 0) {
        avgProgress = (s.completedTopics / s.totalTopics) * 100;
      }
      
      console.log(`[Progress API] Subject ${s.subjectName}: completed=${s.completedTopics}/${s.totalTopics}, avgProgress=${avgProgress.toFixed(2)}%`);
      
      return {
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        totalTopics: s.totalTopics,
        completedTopics: s.completedTopics,
        totalTimeMinutes: s.totalTimeMinutes,
        avgProgress: Math.round(avgProgress * 100) / 100, // Round to 2 decimal places
      };
    });

    const totalCompleted = progress.filter(p => Number(p.progressPercentage) >= 100 || p.completedAt).length;
    
    const result = {
      totalTopics: progress.length,
      completedTopics: totalCompleted,
      totalTimeMinutes: progress.reduce((sum, p) => sum + (p.totalTimeSpentMinutes || 0), 0),
      subjectProgress: subjectProgressArray,
    };

    console.log(`[Progress API] Final result - ${result.completedTopics}/${result.totalTopics} topics completed`);
    console.log(`[Progress API] Subject progress array:`, JSON.stringify(subjectProgressArray, null, 2));

    // Cache for 2 minutes only (progress changes frequently)
    const cacheKey = `progress:${studentId}:overall`;
    await cacheService.set(cacheKey, result, 120);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Progress API] Error:', error);
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

    console.log(`[Progress API] Getting daily progress for student: ${studentId}, days: ${days}`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    startDate.setHours(0, 0, 0, 0);

    const dailyRepository = AppDataSource.getRepository(DailyProgress);
    const dailyProgress = await dailyRepository
      .createQueryBuilder('dp')
      .where('dp.student_id = :studentId', { studentId })
      .andWhere('dp.date >= :startDate', { startDate })
      .orderBy('dp.date', 'DESC')
      .getMany();

    console.log(`[Progress API] Found ${dailyProgress.length} daily progress entries`);

    // Map to ensure proper field names
    const mappedProgress = dailyProgress.map(dp => ({
      id: dp.id,
      studentId: dp.studentId,
      date: dp.date,
      totalStudyTimeMinutes: dp.totalStudyTimeMinutes || 0,
      topicsCompleted: dp.topicsCompleted || 0,
      quizzesAttempted: dp.quizzesAttempted || 0,
      doubtsAsked: dp.doubtsAsked || 0,
      xpEarned: dp.xpEarned || 0,
      streakDays: dp.streakDays || 0,
      goalAchieved: dp.goalAchieved || false,
      subjectWiseTime: dp.subjectWiseTime || {},
    }));

    res.json({ success: true, data: mappedProgress });
  } catch (error) {
    console.error('[Progress API] Daily progress error:', error);
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

    console.log(`[Progress API] Recording daily progress for student: ${studentId}`, req.body);

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
        totalStudyTimeMinutes: 0,
        topicsCompleted: 0,
        quizzesAttempted: 0,
        doubtsAsked: 0,
        xpEarned: 0,
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
    console.log(`[Progress API] Daily progress saved:`, daily);

    // Update student streak
    const studentRepository = AppDataSource.getRepository(Student);
    await studentRepository.update(studentId, {
      streakDays: daily.streakDays,
      lastActivityDate: today,
    });

    // Invalidate cache
    await cacheService.del(`progress:${studentId}:overall`);
    await cacheService.del(`dashboard:stats:${studentId}`);

    res.json({ success: true, data: daily });
  } catch (error) {
    console.error('[Progress API] Record daily error:', error);
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

    console.log(`[Progress API] Getting streak for student: ${studentId}`);

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
    let isStreakActive = false;
    
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));
      isStreakActive = diffDays <= 1; // Same day or yesterday
    }

    const result = {
      streakDays: isStreakActive ? (student.streakDays || 0) : 0,
      lastActivityDate: student.lastActivityDate,
      isStreakActive,
      xp: student.xp || 0,
      level: student.level || 1,
    };

    console.log(`[Progress API] Streak result:`, result);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Progress API] Streak error:', error);
    next(error);
  }
});

export default router;
