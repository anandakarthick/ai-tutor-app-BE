import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Chapter } from '../entities/Chapter';
import { Topic } from '../entities/Topic';
import { StudentProgress } from '../entities/StudentProgress';
import { authenticate, AuthRequest, optionalAuth } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/chapters
 * @desc    Get chapters by book with optional student progress
 * @access  Public (with optional auth for progress)
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookId, studentId } = req.query;

    if (!bookId) {
      return res.status(400).json({ success: false, message: 'bookId is required' });
    }

    console.log('[chapters] Fetching chapters for book:', bookId, 'student:', studentId);

    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapters = await chapterRepository.find({
      where: { bookId: bookId as string, isActive: true },
      order: { chapterNumber: 'ASC' },
    });

    console.log('[chapters] Found', chapters.length, 'chapters');

    // If studentId provided, calculate progress for each chapter
    if (studentId && chapters.length > 0) {
      const topicRepository = AppDataSource.getRepository(Topic);
      const progressRepository = AppDataSource.getRepository(StudentProgress);

      // Get all topics for these chapters
      const chapterIds = chapters.map(c => c.id);
      
      // Get student progress for all topics in these chapters
      const progressRecords = await progressRepository
        .createQueryBuilder('progress')
        .innerJoin('progress.topic', 'topic')
        .where('topic.chapterId IN (:...chapterIds)', { chapterIds })
        .andWhere('progress.studentId = :studentId', { studentId })
        .select([
          'progress.topicId AS topic_id',
          'progress.progressPercentage AS progress_percentage', 
          'progress.completedAt AS completed_at'
        ])
        .getRawMany();

      console.log('[chapters] Progress records found:', progressRecords.length);
      console.log('[chapters] Progress sample:', progressRecords[0]);

      // Create progress map by topicId
      const progressMap = new Map<string, { progress: number; completed: boolean }>();
      progressRecords.forEach((p: any) => {
        const topicId = p.topic_id;
        const progressPct = Number(p.progress_percentage) || 0;
        const completedAt = p.completed_at;
        
        progressMap.set(topicId, {
          progress: progressPct,
          completed: completedAt !== null || progressPct >= 100,
        });
      });

      console.log('[chapters] Progress map size:', progressMap.size);

      // Get topics for each chapter
      const topics = await topicRepository.find({
        where: { isActive: true },
        select: ['id', 'chapterId'],
      });

      // Group topics by chapter
      const chapterTopicsMap = new Map<string, string[]>();
      topics.forEach(topic => {
        if (chapterIds.includes(topic.chapterId)) {
          const existing = chapterTopicsMap.get(topic.chapterId) || [];
          existing.push(topic.id);
          chapterTopicsMap.set(topic.chapterId, existing);
        }
      });

      console.log('[chapters] Topics per chapter:', 
        Array.from(chapterTopicsMap.entries()).map(([k, v]) => `${k.substring(0,8)}: ${v.length}`));

      // Calculate chapter progress
      const chaptersWithProgress = chapters.map(chapter => {
        const topicIds = chapterTopicsMap.get(chapter.id) || [];
        const totalTopics = topicIds.length;
        
        if (totalTopics === 0) {
          return {
            ...chapter,
            totalTopics: 0,
            completedTopics: 0,
            progress: 0,
            isCompleted: false,
          };
        }

        let completedTopics = 0;
        let totalProgress = 0;

        topicIds.forEach(topicId => {
          const topicProgress = progressMap.get(topicId);
          if (topicProgress) {
            totalProgress += topicProgress.progress;
            if (topicProgress.completed) {
              completedTopics++;
            }
          }
        });

        const avgProgress = Math.round(totalProgress / totalTopics);
        const isCompleted = completedTopics === totalTopics && totalTopics > 0;

        console.log(`[chapters] Chapter ${chapter.chapterTitle.substring(0, 20)}: ${completedTopics}/${totalTopics} topics, ${avgProgress}% progress, completed: ${isCompleted}`);

        return {
          ...chapter,
          totalTopics,
          completedTopics,
          progress: avgProgress,
          isCompleted,
        };
      });

      return res.json({ success: true, data: chaptersWithProgress });
    }

    // No studentId - return chapters without progress
    const chaptersWithDefaults = chapters.map(c => ({
      ...c,
      totalTopics: 0,
      completedTopics: 0,
      progress: 0,
      isCompleted: false,
    }));

    res.json({ success: true, data: chaptersWithDefaults });
  } catch (error) {
    console.log('[chapters] Error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/chapters/:id
 * @desc    Get chapter by ID with topics
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cached = await cacheService.get<Chapter>(`chapter:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapter = await chapterRepository.findOne({
      where: { id, isActive: true },
      relations: ['topics'],
    });

    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }

    await cacheService.set(`chapter:${id}`, chapter, 3600);

    res.json({ success: true, data: chapter });
  } catch (error) {
    next(error);
  }
});

export default router;
