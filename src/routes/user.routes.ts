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
      select: [
        'id', 'fullName', 'email', 'phone', 'role', 'isActive', 
        'profileImageUrl', 'isEmailVerified', 'isPhoneVerified',
        'notificationPreferences', 'createdAt', 'updatedAt'
      ],
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

    console.log('[UserRoutes] PUT /users/:id called');
    console.log('[UserRoutes] User ID:', id);
    console.log('[UserRoutes] Request body:', req.body);
    console.log('[UserRoutes] Authenticated user:', req.user?.userId);

    // Users can only update their own profile unless admin
    if (req.user!.userId !== id && req.user!.role !== UserRole.ADMIN) {
      console.log('[UserRoutes] Forbidden - user trying to update another user');
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const userRepository = AppDataSource.getRepository(User);
    
    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { id } });
    if (!existingUser) {
      console.log('[UserRoutes] User not found:', id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;

    console.log('[UserRoutes] Update data:', updateData);

    await userRepository.update(id, updateData);

    // Fetch updated user with all fields
    const updatedUser = await userRepository.findOne({
      where: { id },
      select: [
        'id', 'fullName', 'email', 'phone', 'role', 'isActive',
        'profileImageUrl', 'isEmailVerified', 'isPhoneVerified',
        'authProvider', 'notificationPreferences', 'createdAt', 'updatedAt'
      ],
    });

    console.log('[UserRoutes] Updated user:', updatedUser);

    res.json({ 
      success: true, 
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.log('[UserRoutes] Error updating user:', error);
    next(error);
  }
});

export default router;
