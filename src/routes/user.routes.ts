import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { authenticate, AuthRequest, authorize } from '../middlewares/auth';
import { UserRole } from '../entities/User';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
      select: ['id', 'fullName', 'email', 'phone', 'role', 'isActive', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: users });
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
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
      select: ['id', 'fullName', 'email', 'phone', 'role', 'isActive', 'createdAt'],
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
    const { fullName, email, profileImageUrl } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    await userRepository.update(req.params.id, {
      ...(fullName && { fullName }),
      ...(email && { email }),
      ...(profileImageUrl && { profileImageUrl }),
    });

    const user = await userRepository.findOne({ where: { id: req.params.id } });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
