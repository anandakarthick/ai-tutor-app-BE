import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Subject } from '../entities/Subject';
import { Chapter } from '../entities/Chapter';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';
import { Medium } from '../entities/enums';

const router = Router();

/**
 * @route   GET /api/v1/subjects
 * @desc    Get subjects by class with chapter counts
 * @access  Public
 */
router.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    const { classId, medium = 'english' } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    console.log(`[Subjects API] Getting subjects for classId: ${classId}, medium: ${medium}`);

    // Skip cache for debugging
    // const cacheKey = `subjects:${classId}:${medium}`;
    // const cached = await cacheService.get<any[]>(cacheKey);
    // if (cached) {
    //   return res.json({ success: true, data: cached, cached: true });
    // }

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subjects = await subjectRepository.find({
      where: { 
        classId: classId as string, 
        medium: medium as Medium,
        isActive: true 
      },
      order: { displayOrder: 'ASC' },
    });

    console.log(`[Subjects API] Found ${subjects.length} subjects`);

    // Get chapter counts for each subject
    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapterCounts = await chapterRepository
      .createQueryBuilder('c')
      .innerJoin('c.book', 'b')
      .innerJoin('b.subject', 's')
      .where('s.class_id = :classId', { classId })
      .andWhere('c.is_active = true')
      .select('s.id', 'subjectId')
      .addSelect('COUNT(c.id)', 'totalChapters')
      .groupBy('s.id')
      .getRawMany();

    console.log(`[Subjects API] Chapter counts:`, chapterCounts);

    // Create a map of subject ID to chapter count
    const chapterCountMap: Record<string, number> = {};
    chapterCounts.forEach(cc => {
      chapterCountMap[cc.subjectId] = parseInt(cc.totalChapters) || 0;
    });

    // Add totalChapters to each subject
    const subjectsWithChapters = subjects.map(subject => ({
      ...subject,
      totalChapters: chapterCountMap[subject.id] || 0,
    }));

    console.log(`[Subjects API] Subjects with chapters:`, subjectsWithChapters.map(s => ({
      name: s.displayName,
      id: s.id,
      totalChapters: s.totalChapters,
    })));

    // Cache for 1 hour - uncomment later
    // await cacheService.set(cacheKey, subjectsWithChapters, 3600);

    res.json({ success: true, data: subjectsWithChapters });
  } catch (error) {
    console.error('[Subjects API] Error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/subjects/:id
 * @desc    Get subject by ID with books and chapter count
 * @access  Public
 */
router.get('/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id, isActive: true },
      relations: ['books'],
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Get chapter count
    const chapterRepository = AppDataSource.getRepository(Chapter);
    const chapterCount = await chapterRepository
      .createQueryBuilder('c')
      .innerJoin('c.book', 'b')
      .where('b.subject_id = :subjectId', { subjectId: id })
      .andWhere('c.is_active = true')
      .getCount();

    const subjectWithChapters = {
      ...subject,
      totalChapters: chapterCount,
    };

    res.json({ success: true, data: subjectWithChapters });
  } catch (error) {
    next(error);
  }
});

export default router;
