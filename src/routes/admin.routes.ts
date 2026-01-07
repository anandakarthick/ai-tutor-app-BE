import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Between, ILike, In } from 'typeorm';
import AppDataSource from '../config/database';
import { Admin, AdminRole } from '../entities/Admin';
import { School } from '../entities/School';
import { Student } from '../entities/Student';
import { User } from '../entities/User';
import { Class } from '../entities/Class';
import { Subject } from '../entities/Subject';
import { Board } from '../entities/Board';
import { Book } from '../entities/Book';
import { Chapter } from '../entities/Chapter';
import { Topic } from '../entities/Topic';
import { SubscriptionPlan } from '../entities/SubscriptionPlan';
import { UserSubscription } from '../entities/UserSubscription';
import { Payment, PaymentStatus } from '../entities/Payment';
import { Quiz } from '../entities/Quiz';
import { QuizAttempt } from '../entities/QuizAttempt';
import { LearningSession } from '../entities/LearningSession';
import { Setting } from '../entities/Setting';
import {
  authenticateAdmin,
  authorizeAdmin,
  generateAdminToken,
  generateAdminRefreshToken,
  AdminRequest,
} from '../middlewares/adminAuth';

const router = Router();

// ==================== AUTH ROUTES ====================

/**
 * @route   POST /api/v1/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/auth/login', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'password', 'fullName', 'role', 'isActive', 'permissions', 'profileImageUrl'],
    });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is disabled' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await adminRepository.update(admin.id, { lastLoginAt: new Date() });

    // Generate tokens
    const accessToken = generateAdminToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    // Save refresh token
    await adminRepository.update(admin.id, { refreshToken });

    res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions: admin.permissions,
          profileImageUrl: admin.profileImageUrl,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/auth/logout
 * @desc    Admin logout
 * @access  Private
 */
router.post('/auth/logout', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const adminRepository = AppDataSource.getRepository(Admin);
    await adminRepository.update(req.admin!.adminId, { refreshToken: null });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/auth/me
 * @desc    Get current admin
 * @access  Private
 */
router.get('/auth/me', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: req.currentAdmin });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/auth/profile
 * @desc    Update current admin profile
 * @access  Private
 */
router.put('/auth/profile', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone, profileImageUrl } = req.body;
    const adminId = req.admin!.adminId;

    const adminRepository = AppDataSource.getRepository(Admin);
    
    await adminRepository.update(adminId, {
      fullName,
      phone,
      profileImageUrl,
    });

    const updatedAdmin = await adminRepository.findOne({ where: { id: adminId } });

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: {
        id: updatedAdmin!.id,
        email: updatedAdmin!.email,
        fullName: updatedAdmin!.fullName,
        phone: updatedAdmin!.phone,
        role: updatedAdmin!.role,
        profileImageUrl: updatedAdmin!.profileImageUrl,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/auth/change-password
 * @desc    Change current admin password
 * @access  Private
 */
router.put('/auth/change-password', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin!.adminId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({
      where: { id: adminId },
      select: ['id', 'password'],
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await adminRepository.update(adminId, { password: hashedPassword });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== DASHBOARD ROUTES ====================

/**
 * @route   GET /api/v1/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/dashboard/stats', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const userRepository = AppDataSource.getRepository(User);
    const schoolRepository = AppDataSource.getRepository(School);
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const paymentRepository = AppDataSource.getRepository(Payment);

    // Get counts
    const totalStudents = await studentRepository.count({ where: { isActive: true } });
    const totalUsers = await userRepository.count({ where: { isActive: true } });
    const totalSchools = await schoolRepository.count({ where: { isActive: true } });
    const activeSubscriptions = await subscriptionRepository.count({ where: { status: 'active' } });

    // Get revenue for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyPayments = await paymentRepository.find({
      where: {
        status: PaymentStatus.SUCCESS,
        createdAt: Between(startOfMonth, new Date()),
      },
    });
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Get recent registrations (last 30 days vs previous 30 days for comparison)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentStudents = await studentRepository.count({
      where: { createdAt: Between(thirtyDaysAgo, new Date()) },
    });
    const previousStudents = await studentRepository.count({
      where: { createdAt: Between(sixtyDaysAgo, thirtyDaysAgo) },
    });

    const studentGrowth = previousStudents > 0 
      ? ((recentStudents - previousStudents) / previousStudents * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      data: {
        totalStudents,
        totalUsers,
        totalSchools,
        activeSubscriptions,
        monthlyRevenue,
        studentGrowth: `${studentGrowth}%`,
        recentStats: {
          newStudentsThisMonth: recentStudents,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/dashboard/recent-activity
 * @desc    Get recent activity
 * @access  Private
 */
router.get('/dashboard/recent-activity', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent payments
    const paymentRepository = AppDataSource.getRepository(Payment);
    const recentPayments = await paymentRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Get recent students
    const studentRepository = AppDataSource.getRepository(Student);
    const recentStudents = await studentRepository.find({
      relations: ['user', 'class', 'board'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const activities = [
      ...recentPayments.map(p => ({
        type: p.status === PaymentStatus.SUCCESS ? 'payment' : 'payment_failed',
        message: `Payment ${p.status} - ₹${p.amount}`,
        user: p.user?.fullName || 'Unknown',
        time: p.createdAt,
      })),
      ...recentStudents.map(s => ({
        type: 'registration',
        message: `New student registered: ${s.studentName}`,
        user: s.studentName,
        time: s.createdAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, limit);

    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// ==================== STUDENTS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/students
 * @desc    Get all students with filters
 * @access  Private
 */
router.get('/students', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      classId,
      boardId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const studentRepository = AppDataSource.getRepository(Student);
    
    const queryBuilder = studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.class', 'class')
      .leftJoinAndSelect('student.board', 'board');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(student.studentName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (classId) {
      queryBuilder.andWhere('student.classId = :classId', { classId });
    }

    if (boardId) {
      queryBuilder.andWhere('student.boardId = :boardId', { boardId });
    }

    if (status === 'active') {
      queryBuilder.andWhere('student.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('student.isActive = false');
    }

    // Sorting
    const validSortFields = ['createdAt', 'studentName', 'xp', 'level'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`student.${sortField}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/students/:id
 * @desc    Get student by ID
 * @access  Private
 */
router.get('/students/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({
      where: { id },
      relations: ['user', 'class', 'board'],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get subscription info
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const subscription = await subscriptionRepository.findOne({
      where: { userId: student.userId, status: 'active' },
      relations: ['plan'],
    });

    res.json({
      success: true,
      data: { ...student, subscription },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/students/:id
 * @desc    Update student
 * @access  Private
 */
router.put('/students/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({ where: { id } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await studentRepository.update(id, updateData);

    const updatedStudent = await studentRepository.findOne({
      where: { id },
      relations: ['user', 'class', 'board'],
    });

    res.json({ success: true, data: updatedStudent });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/students/:id
 * @desc    Delete student (soft delete)
 * @access  Private
 */
router.delete('/students/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const studentRepository = AppDataSource.getRepository(Student);
    const student = await studentRepository.findOne({ where: { id } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await studentRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== SCHOOLS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/schools
 * @desc    Get all schools
 * @access  Private
 */
router.get('/schools', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, status } = req.query;

    const schoolRepository = AppDataSource.getRepository(School);
    
    const queryBuilder = schoolRepository.createQueryBuilder('school');

    if (search) {
      queryBuilder.andWhere(
        '(school.schoolName ILIKE :search OR school.city ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status === 'active') {
      queryBuilder.andWhere('school.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('school.isActive = false');
    }

    queryBuilder.orderBy('school.createdAt', 'DESC');

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [schools, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    res.json({
      success: true,
      data: {
        schools,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/schools/:id
 * @desc    Get school by ID
 * @access  Private
 */
router.get('/schools/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schoolRepository = AppDataSource.getRepository(School);
    const school = await schoolRepository.findOne({ where: { id } });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({ success: true, data: school });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/schools
 * @desc    Create school
 * @access  Private
 */
router.post('/schools', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const schoolRepository = AppDataSource.getRepository(School);
    const school = schoolRepository.create(req.body);
    await schoolRepository.save(school);

    res.status(201).json({ success: true, data: school });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/schools/:id
 * @desc    Update school
 * @access  Private
 */
router.put('/schools/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schoolRepository = AppDataSource.getRepository(School);
    const school = await schoolRepository.findOne({ where: { id } });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    await schoolRepository.update(id, req.body);
    const updatedSchool = await schoolRepository.findOne({ where: { id } });

    res.json({ success: true, data: updatedSchool });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/schools/:id
 * @desc    Delete school
 * @access  Private
 */
router.delete('/schools/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const schoolRepository = AppDataSource.getRepository(School);
    await schoolRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'School deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== CLASSES MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/classes
 * @desc    Get all classes
 * @access  Private
 */
router.get('/classes', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { boardId, status } = req.query;

    const classRepository = AppDataSource.getRepository(Class);
    
    const queryBuilder = classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.board', 'board');

    if (boardId) {
      queryBuilder.andWhere('class.boardId = :boardId', { boardId });
    }

    if (status === 'active') {
      queryBuilder.andWhere('class.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('class.isActive = false');
    }

    queryBuilder.orderBy('class.displayOrder', 'ASC');

    const classes = await queryBuilder.getMany();

    // Get student counts for each class
    const studentRepository = AppDataSource.getRepository(Student);
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await studentRepository.count({ where: { classId: cls.id, isActive: true } });
        return { ...cls, studentCount };
      })
    );

    res.json({ success: true, data: classesWithCount });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/classes/:id
 * @desc    Get class by ID
 * @access  Private
 */
router.get('/classes/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classRepository = AppDataSource.getRepository(Class);
    const studentRepository = AppDataSource.getRepository(Student);
    const subjectRepository = AppDataSource.getRepository(Subject);

    const classEntity = await classRepository.findOne({
      where: { id },
      relations: ['board'],
    });

    if (!classEntity) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get counts
    const studentCount = await studentRepository.count({ where: { classId: classEntity.id, isActive: true } });
    const subjectCount = await subjectRepository.count({ where: { classId: classEntity.id, isActive: true } });

    res.json({
      success: true,
      data: { ...classEntity, studentCount, subjectCount },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/classes
 * @desc    Create class
 * @access  Private
 */
router.post('/classes', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    const newClass = classRepository.create(req.body);
    await classRepository.save(newClass);

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/classes/:id
 * @desc    Update class
 * @access  Private
 */
router.put('/classes/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classRepository = AppDataSource.getRepository(Class);
    await classRepository.update(id, req.body);
    const updatedClass = await classRepository.findOne({ where: { id }, relations: ['board'] });

    res.json({ success: true, data: updatedClass });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/classes/:id
 * @desc    Delete class
 * @access  Private
 */
router.delete('/classes/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classRepository = AppDataSource.getRepository(Class);
    await classRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== SUBJECTS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/subjects
 * @desc    Get all subjects
 * @access  Private
 */
router.get('/subjects', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, status } = req.query;

    const subjectRepository = AppDataSource.getRepository(Subject);
    
    const queryBuilder = subjectRepository
      .createQueryBuilder('subject')
      .leftJoinAndSelect('subject.class', 'class');

    if (classId) {
      queryBuilder.andWhere('subject.classId = :classId', { classId });
    }

    if (status === 'active') {
      queryBuilder.andWhere('subject.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('subject.isActive = false');
    }

    queryBuilder.orderBy('subject.displayOrder', 'ASC');

    const subjects = await queryBuilder.getMany();

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/subjects/:id
 * @desc    Get subject by ID
 * @access  Private
 */
router.get('/subjects/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id },
      relations: ['class'],
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/subjects
 * @desc    Create subject
 * @access  Private
 */
router.post('/subjects', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = subjectRepository.create(req.body);
    await subjectRepository.save(subject);

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/subjects/:id
 * @desc    Update subject
 * @access  Private
 */
router.put('/subjects/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subjectRepository = AppDataSource.getRepository(Subject);
    await subjectRepository.update(id, req.body);
    const updatedSubject = await subjectRepository.findOne({ where: { id }, relations: ['class'] });

    res.json({ success: true, data: updatedSubject });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/subjects/:id
 * @desc    Delete subject
 * @access  Private
 */
router.delete('/subjects/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const subjectRepository = AppDataSource.getRepository(Subject);
    await subjectRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== SUBJECT MAPPING (BOOKS/CHAPTERS/TOPICS) ====================

/**
 * @route   GET /api/v1/admin/books
 * @desc    Get all books (subject mappings)
 * @access  Private
 */
router.get('/books', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, subjectId, status } = req.query;

    const bookRepository = AppDataSource.getRepository(Book);
    
    const queryBuilder = bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.class', 'class')
      .leftJoinAndSelect('book.subject', 'subject')
      .leftJoinAndSelect('book.board', 'board');

    if (classId) {
      queryBuilder.andWhere('book.classId = :classId', { classId });
    }

    if (subjectId) {
      queryBuilder.andWhere('book.subjectId = :subjectId', { subjectId });
    }

    if (status === 'active') {
      queryBuilder.andWhere('book.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('book.isActive = false');
    }

    queryBuilder.orderBy('book.displayOrder', 'ASC');

    const books = await queryBuilder.getMany();

    // Get chapter counts for each book
    const chapterRepository = AppDataSource.getRepository(Chapter);
    const topicRepository = AppDataSource.getRepository(Topic);
    
    const booksWithCounts = await Promise.all(
      books.map(async (book) => {
        const chapterCount = await chapterRepository.count({ where: { bookId: book.id } });
        const chapters = await chapterRepository.find({ where: { bookId: book.id } });
        let topicCount = 0;
        for (const chapter of chapters) {
          topicCount += await topicRepository.count({ where: { chapterId: chapter.id } });
        }
        return { ...book, chapterCount, topicCount };
      })
    );

    res.json({ success: true, data: booksWithCounts });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/books/:id
 * @desc    Get book by ID with chapters
 * @access  Private
 */
router.get('/books/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const bookRepository = AppDataSource.getRepository(Book);
    const book = await bookRepository.findOne({
      where: { id },
      relations: ['class', 'subject', 'board', 'chapters', 'chapters.topics'],
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/books
 * @desc    Create book
 * @access  Private
 */
router.post('/books', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const bookRepository = AppDataSource.getRepository(Book);
    const book = bookRepository.create(req.body);
    await bookRepository.save(book);

    const savedBook = await bookRepository.findOne({
      where: { id: book.id },
      relations: ['class', 'subject', 'board'],
    });

    res.status(201).json({ success: true, data: savedBook });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/books/:id
 * @desc    Update book
 * @access  Private
 */
router.put('/books/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const bookRepository = AppDataSource.getRepository(Book);
    await bookRepository.update(id, req.body);
    const updatedBook = await bookRepository.findOne({
      where: { id },
      relations: ['class', 'subject', 'board'],
    });

    res.json({ success: true, data: updatedBook });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/books/:id
 * @desc    Delete book
 * @access  Private
 */
router.delete('/books/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const bookRepository = AppDataSource.getRepository(Book);
    await bookRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== SUBSCRIPTION PLANS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/plans
 * @desc    Get all subscription plans
 * @access  Private
 */
router.get('/plans', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);

    const plans = await planRepository.find({
      order: { displayOrder: 'ASC' },
    });

    // Get subscriber count for each plan
    const plansWithCount = await Promise.all(
      plans.map(async (plan) => {
        const subscriberCount = await subscriptionRepository.count({
          where: { planId: plan.id },
        });
        return { ...plan, subscriberCount };
      })
    );

    res.json({ success: true, data: plansWithCount });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/plans/:id
 * @desc    Get plan by ID
 * @access  Private
 */
router.get('/plans/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);

    const plan = await planRepository.findOne({ where: { id } });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Get subscriber count
    const subscriberCount = await subscriptionRepository.count({ where: { planId: plan.id } });

    res.json({
      success: true,
      data: { ...plan, subscriberCount },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/plans
 * @desc    Create subscription plan
 * @access  Private
 */
router.post('/plans', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plan = planRepository.create(req.body);
    await planRepository.save(plan);

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/plans/:id
 * @desc    Update subscription plan
 * @access  Private
 */
router.put('/plans/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    await planRepository.update(id, req.body);
    const updatedPlan = await planRepository.findOne({ where: { id } });

    res.json({ success: true, data: updatedPlan });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/plans/:id
 * @desc    Delete subscription plan
 * @access  Private (Super Admin only)
 */
router.delete('/plans/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    await planRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== TRANSACTIONS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/transactions
 * @desc    Get all transactions
 * @access  Private
 */
router.get('/transactions', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, search, fromDate, toDate } = req.query;

    const paymentRepository = AppDataSource.getRepository(Payment);
    
    const queryBuilder = paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user');

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(payment.gatewayOrderId ILIKE :search OR payment.gatewayPaymentId ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (fromDate && toDate) {
      queryBuilder.andWhere('payment.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate: new Date(fromDate as string),
        toDate: new Date(toDate as string),
      });
    }

    queryBuilder.orderBy('payment.createdAt', 'DESC');

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Calculate totals
    const totalAmount = await paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        summary: {
          totalRevenue: totalAmount?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/transactions/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const paymentRepository = AppDataSource.getRepository(Payment);
    const transaction = await paymentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN USERS MANAGEMENT ====================

/**
 * @route   GET /api/v1/admin/admins
 * @desc    Get all admin users
 * @access  Private
 */
router.get('/admins', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const adminRepository = AppDataSource.getRepository(Admin);
    const admins = await adminRepository.find({
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/admins/:id
 * @desc    Get admin by ID
 * @access  Private
 */
router.get('/admins/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({ where: { id } });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/admins
 * @desc    Create admin user
 * @access  Private (Super Admin only)
 */
router.post('/admins', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, phone, password, role, permissions } = req.body;

    const adminRepository = AppDataSource.getRepository(Admin);

    // Check if email already exists
    const existingAdmin = await adminRepository.findOne({ where: { email: email.toLowerCase() } });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = adminRepository.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: role || AdminRole.ADMIN,
      permissions,
    });

    await adminRepository.save(admin);

    // Remove password from response
    const { password: _, ...adminData } = admin;

    res.status(201).json({ success: true, data: adminData });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/admins/:id
 * @desc    Update admin user
 * @access  Private (Super Admin only)
 */
router.put('/admins/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    const adminRepository = AppDataSource.getRepository(Admin);

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await adminRepository.update(id, updateData);
    const updatedAdmin = await adminRepository.findOne({ where: { id } });

    res.json({ success: true, data: updatedAdmin });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/admins/:id
 * @desc    Delete admin user
 * @access  Private (Super Admin only)
 */
router.delete('/admins/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.admin!.adminId) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({ where: { id } });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Prevent deletion of super admin
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return res.status(400).json({ success: false, message: 'Cannot delete super admin' });
    }

    await adminRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== ANALYTICS ====================

/**
 * @route   GET /api/v1/admin/analytics/overview
 * @desc    Get analytics overview
 * @access  Private
 */
router.get('/analytics/overview', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const studentRepository = AppDataSource.getRepository(Student);
    const paymentRepository = AppDataSource.getRepository(Payment);
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const sessionRepository = AppDataSource.getRepository(LearningSession);

    // Daily registrations
    const dailyRegistrations = await studentRepository
      .createQueryBuilder('student')
      .select("DATE(student.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('student.created_at >= :startDate', { startDate })
      .groupBy("DATE(student.created_at)")
      .orderBy("DATE(student.created_at)", 'ASC')
      .getRawMany();

    // Daily revenue
    const dailyRevenue = await paymentRepository
      .createQueryBuilder('payment')
      .select("DATE(payment.created_at)", 'date')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.created_at >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .groupBy("DATE(payment.created_at)")
      .orderBy("DATE(payment.created_at)", 'ASC')
      .getRawMany();

    // Subscription distribution
    const subscriptionStats = await subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoin('subscription.plan', 'plan')
      .select('plan.planName', 'planName')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.status = :status', { status: 'active' })
      .groupBy('plan.planName')
      .getRawMany();

    // Total stats
    const totalUsers = await studentRepository.count({ where: { isActive: true } });
    
    // Use ai_interactions instead of questionsAsked
    const totalInteractions = await sessionRepository
      .createQueryBuilder('session')
      .select('SUM(session.ai_interactions)', 'total')
      .getRawOne();

    // Monthly revenue for chart
    const monthlyRevenue = await paymentRepository
      .createQueryBuilder('payment')
      .select("TO_CHAR(payment.created_at, 'Mon')", 'month')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('payment.created_at >= :sixMonthsAgo', { 
        sixMonthsAgo: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) 
      })
      .groupBy("TO_CHAR(payment.created_at, 'Mon'), DATE_TRUNC('month', payment.created_at)")
      .orderBy("DATE_TRUNC('month', payment.created_at)", 'ASC')
      .getRawMany();

    res.json({
      success: true,
      data: {
        dailyRegistrations,
        dailyRevenue,
        subscriptionStats,
        monthlyRevenue,
        summary: {
          totalUsers,
          totalInteractions: totalInteractions?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/analytics/top-subjects
 * @desc    Get top subjects by usage
 * @access  Private
 */
router.get('/analytics/top-subjects', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const studentRepository = AppDataSource.getRepository(Student);

    // Get student counts per subject interest (from student_interests table or inferred)
    // Since LearningSession links to Topic, we join through Topic -> Chapter -> Book -> Subject
    const subjectStats = await subjectRepository
      .createQueryBuilder('subject')
      .leftJoin('subject.books', 'book')
      .leftJoin('book.chapters', 'chapter')
      .leftJoin('chapter.topics', 'topic')
      .leftJoin('topic.sessions', 'session')
      .select('subject.subjectName', 'subjectName')
      .addSelect('subject.colorCode', 'color')
      .addSelect('COUNT(DISTINCT session.id)', 'sessions')
      .addSelect('SUM(session.ai_interactions)', 'interactions')
      .where('subject.isActive = true')
      .groupBy('subject.id, subject.subjectName, subject.colorCode')
      .orderBy('COUNT(DISTINCT session.id)', 'DESC')
      .limit(5)
      .getRawMany();

    res.json({ success: true, data: subjectStats });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/analytics/top-classes
 * @desc    Get top classes by students
 * @access  Private
 */
router.get('/analytics/top-classes', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const quizAttemptRepository = AppDataSource.getRepository(QuizAttempt);

    // Get student counts per class
    const classStats = await studentRepository
      .createQueryBuilder('student')
      .leftJoin('student.class', 'class')
      .select('class.className', 'className')
      .addSelect('COUNT(*)', 'students')
      .where('student.isActive = true')
      .groupBy('class.id, class.className')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    res.json({ success: true, data: classStats });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/analytics/recent-activity
 * @desc    Get recent user activity
 * @access  Private
 */
router.get('/analytics/recent-activity', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = '10', page = '1' } = req.query;
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    const skip = (pageNum - 1) * limitNum;

    const quizAttemptRepository = AppDataSource.getRepository(QuizAttempt);

    const [activities, total] = await quizAttemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.student', 'student')
      .leftJoinAndSelect('attempt.quiz', 'quiz')
      .orderBy('attempt.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== BOARDS ====================

/**
 * @route   GET /api/v1/admin/boards
 * @desc    Get all boards with filters
 * @access  Private
 */
router.get('/boards', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    
    const boardRepository = AppDataSource.getRepository(Board);
    const classRepository = AppDataSource.getRepository(Class);
    const studentRepository = AppDataSource.getRepository(Student);
    
    const queryBuilder = boardRepository.createQueryBuilder('board');

    // Apply filters
    if (status === 'active') {
      queryBuilder.andWhere('board.isActive = true');
    } else if (status === 'inactive') {
      queryBuilder.andWhere('board.isActive = false');
    }

    if (search) {
      queryBuilder.andWhere(
        '(board.name ILIKE :search OR board.fullName ILIKE :search OR board.state ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy('board.displayOrder', 'ASC');

    const boards = await queryBuilder.getMany();

    // Get class and student counts for each board
    const boardsWithCounts = await Promise.all(
      boards.map(async (board) => {
        const classCount = await classRepository.count({ where: { boardId: board.id, isActive: true } });
        const studentCount = await studentRepository.count({ where: { boardId: board.id, isActive: true } });
        return { ...board, classCount, studentCount };
      })
    );

    res.json({ success: true, data: boardsWithCounts });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/boards/:id
 * @desc    Get board by ID
 * @access  Private
 */
router.get('/boards/:id', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const boardRepository = AppDataSource.getRepository(Board);
    const classRepository = AppDataSource.getRepository(Class);
    const studentRepository = AppDataSource.getRepository(Student);

    const board = await boardRepository.findOne({ where: { id } });

    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    // Get counts
    const classCount = await classRepository.count({ where: { boardId: board.id, isActive: true } });
    const studentCount = await studentRepository.count({ where: { boardId: board.id, isActive: true } });

    res.json({ 
      success: true, 
      data: { ...board, classCount, studentCount } 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/boards
 * @desc    Create board
 * @access  Private
 */
router.post('/boards', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { name, fullName, state, description, logoUrl, displayOrder } = req.body;

    if (!name || !fullName) {
      return res.status(400).json({ success: false, message: 'Name and full name are required' });
    }

    const boardRepository = AppDataSource.getRepository(Board);

    // Check if board name already exists
    const existingBoard = await boardRepository.findOne({ where: { name } });
    if (existingBoard) {
      return res.status(400).json({ success: false, message: 'Board with this name already exists' });
    }

    const board = boardRepository.create({
      name,
      fullName,
      state,
      description,
      logoUrl,
      displayOrder: displayOrder || 0,
      isActive: true,
    });
    await boardRepository.save(board);

    res.status(201).json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/boards/:id
 * @desc    Update board
 * @access  Private
 */
router.put('/boards/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, fullName, state, description, logoUrl, displayOrder, isActive } = req.body;

    const boardRepository = AppDataSource.getRepository(Board);
    
    const board = await boardRepository.findOne({ where: { id } });
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    // Check if new name already exists (if name is being changed)
    if (name && name !== board.name) {
      const existingBoard = await boardRepository.findOne({ where: { name } });
      if (existingBoard) {
        return res.status(400).json({ success: false, message: 'Board with this name already exists' });
      }
    }

    await boardRepository.update(id, {
      name: name ?? board.name,
      fullName: fullName ?? board.fullName,
      state: state !== undefined ? state : board.state,
      description: description !== undefined ? description : board.description,
      logoUrl: logoUrl !== undefined ? logoUrl : board.logoUrl,
      displayOrder: displayOrder ?? board.displayOrder,
      isActive: isActive !== undefined ? isActive : board.isActive,
    });
    
    const updatedBoard = await boardRepository.findOne({ where: { id } });

    res.json({ success: true, data: updatedBoard });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/admin/boards/:id
 * @desc    Delete board (soft delete)
 * @access  Private
 */
router.delete('/boards/:id', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const boardRepository = AppDataSource.getRepository(Board);
    const classRepository = AppDataSource.getRepository(Class);

    const board = await boardRepository.findOne({ where: { id } });
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    // Check if board has associated classes
    const classCount = await classRepository.count({ where: { boardId: id, isActive: true } });
    if (classCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete board with ${classCount} active classes. Please reassign or delete the classes first.` 
      });
    }

    await boardRepository.update(id, { isActive: false });

    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== REPORTS ====================

/**
 * @route   GET /api/v1/admin/reports/summary
 * @desc    Get reports summary
 * @access  Private
 */
router.get('/reports/summary', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const studentRepository = AppDataSource.getRepository(Student);
    const paymentRepository = AppDataSource.getRepository(Payment);
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);

    // Get various stats for reports
    const totalStudents = await studentRepository.count({ where: { isActive: true } });
    const totalRevenue = await paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne();

    const activeSubscriptions = await subscriptionRepository.count({ where: { status: 'active' } });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalRevenue: totalRevenue?.total || 0,
        activeSubscriptions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SETTINGS ====================

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get all settings or by category
 * @access  Private
 */
router.get('/settings', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;

    const settingRepository = AppDataSource.getRepository(Setting);
    
    let settings;
    if (category) {
      settings = await settingRepository.find({ where: { category: category as string } });
    } else {
      settings = await settingRepository.find();
    }

    // Group settings by category
    const grouped = settings.reduce((acc: any, setting) => {
      const cat = setting.category || 'general';
      if (!acc[cat]) acc[cat] = {};
      
      // Parse value based on type
      let value: any = setting.value;
      if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = parseInt(setting.value, 10);
      } else if (setting.type === 'json') {
        try { value = JSON.parse(setting.value); } catch (e) { value = setting.value; }
      }
      
      acc[cat][setting.key] = value;
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/settings/:category
 * @desc    Get settings by category
 * @access  Private
 */
router.get('/settings/:category', authenticateAdmin, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;

    const settingRepository = AppDataSource.getRepository(Setting);
    const settings = await settingRepository.find({ where: { category } });

    // Convert to key-value object
    const result: any = {};
    settings.forEach(setting => {
      let value: any = setting.value;
      if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = parseInt(setting.value, 10);
      } else if (setting.type === 'json') {
        try { value = JSON.parse(setting.value); } catch (e) { value = setting.value; }
      }
      result[setting.key] = value;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update multiple settings
 * @access  Private (Super Admin or Admin)
 */
router.put('/settings', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const updates = req.body; // { key1: value1, key2: value2, ... }

    const settingRepository = AppDataSource.getRepository(Setting);

    for (const [key, value] of Object.entries(updates)) {
      const setting = await settingRepository.findOne({ where: { key } });
      
      if (setting) {
        // Convert value to string for storage
        let strValue: string;
        if (typeof value === 'boolean') {
          strValue = value ? 'true' : 'false';
        } else if (typeof value === 'object') {
          strValue = JSON.stringify(value);
        } else {
          strValue = String(value);
        }
        
        await settingRepository.update({ key }, { value: strValue, updatedAt: new Date() });
      } else {
        // Create new setting
        const newSetting = settingRepository.create({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
        });
        await settingRepository.save(newSetting);
      }
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/admin/settings/:category
 * @desc    Update settings by category
 * @access  Private (Super Admin or Admin)
 */
router.put('/settings/:category', authenticateAdmin, authorizeAdmin(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const settingRepository = AppDataSource.getRepository(Setting);

    for (const [key, value] of Object.entries(updates)) {
      const setting = await settingRepository.findOne({ where: { key } });
      
      if (setting) {
        let strValue: string;
        if (typeof value === 'boolean') {
          strValue = value ? 'true' : 'false';
        } else if (typeof value === 'object') {
          strValue = JSON.stringify(value);
        } else {
          strValue = String(value);
        }
        
        await settingRepository.update({ key }, { value: strValue, category, updatedAt: new Date() });
      } else {
        const newSetting = settingRepository.create({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          category,
          type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
        });
        await settingRepository.save(newSetting);
      }
    }

    res.json({ success: true, message: `${category} settings updated successfully` });
  } catch (error) {
    next(error);
  }
});

export default router;
