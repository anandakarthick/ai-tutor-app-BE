import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { authenticate, AuthRequest, authorize } from '../middlewares/auth';
import { UserRole } from '../entities/enums';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const userRepository = AppDataSource.getRepository(User);
    const [users, total] = await userRepository.findAndCount({
      select: ['id', 'fullName', 'email', 'phone', 'role', 'isActive', 'createdAt'],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      order: { createdAt: 'DESC' },
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (req.user!.userId !== id && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id },
      select: ['id', 'fullName', 'email', 'phone', 'role', 'isActive', 'profileImageUrl', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fullName, email, profileImageUrl } = req.body;

    // Users can only update their own profile unless admin
    if (req.user!.userId !== id && req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const userRepository = AppDataSource.getRepository(User);
    await userRepository.update(id, {
      ...(fullName && { fullName }),
      ...(email && { email }),
      ...(profileImageUrl && { profileImageUrl }),
    });

    const updatedUser = await userRepository.findOne({
      where: { id },
      select: ['id', 'fullName', 'email', 'phone', 'role', 'profileImageUrl'],
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

export default router;
