import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Student, Gender, Medium, LearningStyle } from '../entities/Student';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/v1/students
 * @desc    Create student profile
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      studentName,
      dateOfBirth,
      gender,
      schoolName,
      schoolAddress,
      boardId,
      classId,
      section,
      rollNumber,
      medium,
      academicYear,
      previousPercentage,
      learningStyle,
      dailyStudyHours,
      preferredStudyTime,
      careerGoal,
      targetExam,
    } = req.body;

    const studentRepository = AppDataSource.getRepository(Student);

    const student = studentRepository.create({
      userId: req.user!.userId,
      studentName,
      dateOfBirth,
      gender,
      schoolName,
      schoolAddress,
      boardId,
      classId,
      section,
      rollNumber,
      medium: medium || Medium.ENGLISH,
      academicYear,
      previousPercentage,
      learningStyle,
      dailyStudyHours: dailyStudyHours || 2,
      preferredStudyTime,
      careerGoal,
      targetExam,
    });

    await studentRepository.save(student);

    res.status(201).json({
      success: true,
      message: 'Student profile created successfully',
      data: student,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/students
 * @desc    Get all students for user
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const students = await studentRepository.find({
      where: { userId: req.user!.userId },
      relations: ['board', 'class'],
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/students/:id
 * @desc    Get student by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
      relations: ['board', 'class'],
    });

    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/students/:id
 * @desc    Update student
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    
    const student = await studentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    Object.assign(student, req.body);
    await studentRepository.save(student);

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/students/:id/progress
 * @desc    Get student progress summary
 * @access  Private
 */
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        xp: student.xp,
        level: student.level,
        streakDays: student.streakDays,
        lastActivityDate: student.lastActivityDate,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
