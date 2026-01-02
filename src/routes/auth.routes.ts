import { Router, Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { handleHandshake, getServerPublicKey } from '../middlewares/encryption';
import { OtpPurpose } from '../entities/Otp';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { Student } from '../entities/Student';
import { fcmService } from '../services/notification.service';

const router = Router();

/**
 * @route   POST /api/v1/auth/handshake
 * @desc    Perform E2E encryption handshake (key exchange)
 * @access  Public
 */
router.post('/handshake', handleHandshake);

/**
 * @route   GET /api/v1/auth/public-key
 * @desc    Get server's public key for encryption
 * @access  Public
 */
router.get('/public-key', getServerPublicKey);

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 400, 'PHONE_REQUIRED');
    }

    const otpPurpose = purpose === 'registration' ? OtpPurpose.REGISTRATION : OtpPurpose.LOGIN;
    const otp = await authService.generateOtp(phone, otpPurpose);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        // Only include OTP in development for testing
        ...(process.env.NODE_ENV === 'development' && { otp }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      throw new AppError('Phone and OTP are required', 400, 'MISSING_FIELDS');
    }

    const isValid = await authService.verifyOtp(phone, otp);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: { verified: isValid },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      fullName, 
      phone, 
      email, 
      password, 
      fcmToken, 
      deviceInfo,
      // Student profile data
      studentName,
      boardId,
      classId,
      medium,
      schoolName,
      dateOfBirth,
      gender,
      section,
      learningStyle,
      dailyStudyHours,
    } = req.body;

    if (!fullName || !phone) {
      throw new AppError('Full name and phone are required', 400, 'MISSING_FIELDS');
    }

    const result = await authService.register({
      fullName,
      phone,
      email,
      password,
      fcmToken,
      deviceInfo,
      // Student profile data
      studentName,
      boardId,
      classId,
      medium,
      schoolName,
      dateOfBirth,
      gender,
      section,
      learningStyle,
      dailyStudyHours,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        ...result,
        sessionId: result.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with phone and OTP
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp, fcmToken, deviceInfo } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 400, 'PHONE_REQUIRED');
    }

    const result = await authService.loginWithOtp({ 
      phone, 
      otp,
      fcmToken,
      deviceInfo,
    });

    // Subscribe to FCM topics if token provided
    if (fcmToken) {
      try {
        await subscribeFcmTopics(result.user.id, fcmToken);
      } catch (err) {
        console.log('FCM subscription error:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: result.previousSessionTerminated 
        ? 'Login successful. Previous session on another device has been terminated.'
        : 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
        sessionId: result.sessionId,
        previousSessionTerminated: result.previousSessionTerminated,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/login/password
 * @desc    Login with email and password
 * @access  Public
 */
router.post('/login/password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fcmToken, deviceInfo } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    const result = await authService.loginWithPassword(email, password, fcmToken, deviceInfo);

    // Subscribe to FCM topics if token provided
    if (fcmToken) {
      try {
        await subscribeFcmTopics(result.user.id, fcmToken);
      } catch (err) {
        console.log('FCM subscription error:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: result.previousSessionTerminated 
        ? 'Login successful. Previous session on another device has been terminated.'
        : 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
        sessionId: result.sessionId,
        previousSessionTerminated: result.previousSessionTerminated,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/validate-session
 * @desc    Validate if current session is still active
 * @access  Private
 */
router.post('/validate-session', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.user?.sessionId;
    const userId = req.user?.userId;

    if (!sessionId || !userId) {
      return res.status(200).json({
        success: true,
        data: { 
          valid: false,
          reason: 'MISSING_SESSION_INFO',
        },
      });
    }

    const isValid = await authService.validateSession(userId, sessionId);

    res.status(200).json({
      success: true,
      data: { 
        valid: isValid,
        reason: isValid ? null : 'SESSION_TERMINATED_ON_OTHER_DEVICE',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1] || '';
    const { refreshToken } = req.body;

    await authService.logout(req.user!.userId, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/fcm-token
 * @desc    Update FCM token and subscribe to topics
 * @access  Private
 */
router.post('/fcm-token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      throw new AppError('FCM token is required', 400, 'FCM_TOKEN_REQUIRED');
    }

    // Update FCM token in database
    await authService.updateFcmToken(req.user!.userId, fcmToken);

    // Subscribe to topics
    const subscribedTopics = await subscribeFcmTopics(req.user!.userId, fcmToken);

    res.status(200).json({
      success: true,
      message: 'FCM token updated and subscribed to topics',
      data: {
        subscribedTopics,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/auth/fcm-token
 * @desc    Remove FCM token (unregister device)
 * @access  Private
 */
router.delete('/fcm-token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'fcmToken'],
    });

    if (user?.fcmToken) {
      // Unsubscribe from all_users topic
      await fcmService.unsubscribeFromTopic([user.fcmToken], 'all_users');
      
      // Clear FCM token
      await userRepository.update(req.user!.userId, { fcmToken: undefined });
    }

    res.status(200).json({
      success: true,
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.currentUser,
        sessionId: req.user?.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to subscribe FCM token to topics
 */
async function subscribeFcmTopics(userId: string, fcmToken: string): Promise<string[]> {
  const defaultTopics = ['all_users'];
  
  // Get user's student profile to subscribe to relevant topics
  const studentRepository = AppDataSource.getRepository(Student);
  const students = await studentRepository.find({
    where: { userId },
    relations: ['board', 'class'],
  });

  // Add student-specific topics
  for (const student of students) {
    if (student.board) {
      defaultTopics.push(`board_${student.board.name.toLowerCase()}`);
    }
    if (student.class) {
      defaultTopics.push(`class_${student.class.className}`);
    }
    defaultTopics.push(`student_${student.id}`);
  }

  // Subscribe to all topics
  const subscribedTopics: string[] = [];
  for (const topic of defaultTopics) {
    try {
      const result = await fcmService.subscribeToTopic([fcmToken], topic);
      if (result.successCount > 0) {
        subscribedTopics.push(topic);
      }
    } catch (err) {
      console.log(`Failed to subscribe to topic ${topic}:`, err);
    }
  }

  return subscribedTopics;
}

export default router;
