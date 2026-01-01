import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { Student } from '../entities/Student';
import { StudentProgress } from '../entities/StudentProgress';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/v1/students
 * @desc    Create a new student profile
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      studentName,
      dateOfBirth,
      gender,
      schoolName,
      boardId,
      classId,
      section,
      medium,
    } = req.body;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = studentRepository.create({
      userId: req.user!.userId,
      studentName,
      dateOfBirth,
      gender,
      schoolName,
      boardId,
      classId,
      section,
      medium,
    });

    await studentRepository.save(student);

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/students
 * @desc    Get all students for current user
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const students = await studentRepository.find({
      where: { userId: req.user!.userId, isActive: true },
      relations: ['board', 'class'],
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
    const { id } = req.params;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id, userId: req.user!.userId },
      relations: ['board', 'class'],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/students/:id
 * @desc    Update student profile
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const studentRepository = AppDataSource.getRepository(Student);
    
    // Verify ownership
    const student = await studentRepository.findOne({
      where: { id, userId: req.user!.userId },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await studentRepository.update(id, updateData);

    const updatedStudent = await studentRepository.findOne({
      where: { id },
      relations: ['board', 'class'],
    });

    res.json({ success: true, data: updatedStudent });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/students/:id/progress
 * @desc    Get student's progress
 * @access  Private
 */
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const progressRepository = AppDataSource.getRepository(StudentProgress);
    const progress = await progressRepository.find({
      where: { studentId: id },
      relations: ['topic', 'topic.chapter'],
    });

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

export default router;
