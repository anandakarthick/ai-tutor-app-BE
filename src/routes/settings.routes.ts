import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { Setting } from '../entities/Setting';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

// ==================== Public Settings ====================

/**
 * @route   GET /api/v1/settings/public
 * @desc    Get public site settings (no auth required)
 * @access  Public
 */
router.get('/public', async (req, res: Response, next: NextFunction) => {
  try {
    const settingRepository = AppDataSource.getRepository(Setting);
    
    // Fetch all general/public settings including app settings
    const settings = await settingRepository.find({
      where: [{ category: 'general' }, { category: 'contact' }, { category: 'social' }, { category: 'app' }],
    });

    // Convert to key-value object
    const result: Record<string, any> = {};
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

    // Return with mapped keys (handle both underscore and camelCase)
    res.json({
      success: true,
      data: {
        // Site info
        siteName: result.site_name || result.siteName || 'Viha AI',
        tagline: result.site_description || result.tagline || result.site_tagline || 'Your Personal AI-Powered Learning Companion',
        supportEmail: result.support_email || result.supportEmail || 'support@example.com',
        supportPhone: result.support_phone || result.supportPhone || '+91 98765 43210',
        whatsappNumber: result.whatsapp_number || result.whatsappNumber || '919876543210',
        address: result.address || result.company_address || 'Chennai, Tamil Nadu, India',
        // Social URLs
        facebookUrl: result.facebook_url || result.facebookUrl || '',
        twitterUrl: result.twitter_url || result.twitterUrl || '',
        instagramUrl: result.instagram_url || result.instagramUrl || '',
        linkedinUrl: result.linkedin_url || result.linkedinUrl || '',
        youtubeUrl: result.youtube_url || result.youtubeUrl || '',
        // Maintenance mode
        maintenanceMode: result.maintenance_mode === true || result.maintenance_mode === 'true',
        maintenanceMessage: result.maintenance_message || 'We are currently under maintenance. Please check back soon.',
        // App version settings
        appCurrentVersion: result.app_current_version || '1.0.0',
        appMinVersion: result.app_min_version || '1.0.0',
        appForceUpdate: result.app_force_update === true || result.app_force_update === 'true',
        appUpdateMessage: result.app_update_message || 'A new version is available. Please update to continue.',
        playStoreUrl: result.play_store_url || '',
        appStoreUrl: result.app_store_url || '',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Notification Preferences ====================

/**
 * @route   GET /api/v1/settings/notifications
 * @desc    Get user's notification preferences
 * @access  Private
 */
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user!.userId },
      select: ['id', 'notificationPreferences'],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Default preferences if not set
    const defaultPreferences = {
      masterEnabled: true,
      studyReminders: true,
      quizAlerts: true,
      achievements: true,
      newContent: true,
      tips: false,
      promotions: false,
    };

    res.json({
      success: true,
      data: user.notificationPreferences || defaultPreferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/settings/notifications
 * @desc    Update user's notification preferences
 * @access  Private
 */
router.put('/notifications', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const preferences = req.body;

    const userRepository = AppDataSource.getRepository(User);
    await userRepository.update(req.user!.userId, {
      notificationPreferences: preferences,
    });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Help Center ====================

/**
 * @route   GET /api/v1/settings/help/faqs
 * @desc    Get FAQs
 * @access  Public
 */
router.get('/help/faqs', async (req, res: Response, next: NextFunction) => {
  try {
    // In production, these would come from a database
    const faqs = [
      {
        id: '1',
        question: 'How do I start learning?',
        answer: 'Go to the Learn tab, select a subject, choose a chapter, and start with any lesson. Our AI tutor will guide you through the content.',
        category: 'getting_started',
      },
      {
        id: '2',
        question: 'How does the streak work?',
        answer: 'Complete at least one lesson daily to maintain your streak. Your streak resets if you miss a day. Longer streaks earn bonus XP!',
        category: 'features',
      },
      {
        id: '3',
        question: 'How do I ask doubts?',
        answer: 'Tap "Ask Doubt" on the home screen or during any lesson. Type your question or upload an image, and our AI tutor will help answer your questions instantly.',
        category: 'features',
      },
      {
        id: '4',
        question: 'How are quizzes scored?',
        answer: 'Each correct answer gives XP points based on difficulty. Bonus points for completing quizzes faster. You need 40% to pass most quizzes.',
        category: 'quizzes',
      },
      {
        id: '5',
        question: 'Can I change my class or board?',
        answer: 'Contact our support team to change your class or board. This will reset some of your progress to match the new curriculum.',
        category: 'account',
      },
      {
        id: '6',
        question: 'How do I cancel my subscription?',
        answer: 'Go to Profile > Subscription > Manage Subscription. You can cancel anytime, and you\'ll retain access until the end of your billing period.',
        category: 'subscription',
      },
      {
        id: '7',
        question: 'Is my data safe?',
        answer: 'Yes! We use end-to-end encryption for sensitive data. Your personal information is never shared with third parties.',
        category: 'privacy',
      },
      {
        id: '8',
        question: 'How do study plans work?',
        answer: 'Our AI creates personalized study plans based on your goals, available time, and learning pace. Plans adapt as you progress.',
        category: 'features',
      },
    ];

    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
});

// ==================== Contact Information ====================

/**
 * @route   GET /api/v1/settings/contact
 * @desc    Get contact information
 * @access  Public
 */
router.get('/contact', async (req, res: Response, next: NextFunction) => {
  try {
    const contactInfo = {
      email: 'support@aitutorapp.com',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      address: '123, Education Tower, Tech Park, Bangalore - 560001, Karnataka, India',
      supportHours: 'Mon-Sat: 9 AM - 8 PM IST',
      socialMedia: {
        twitter: 'https://twitter.com/aitutorapp',
        instagram: 'https://instagram.com/aitutorapp',
        facebook: 'https://facebook.com/aitutorapp',
        youtube: 'https://youtube.com/@aitutorapp',
      },
    };

    res.json({ success: true, data: contactInfo });
  } catch (error) {
    next(error);
  }
});

// ==================== App Info ====================

/**
 * @route   GET /api/v1/settings/app-info
 * @desc    Get app information (dynamic from database)
 * @access  Public
 */
router.get('/app-info', async (req, res: Response, next: NextFunction) => {
  try {
    const settingRepository = AppDataSource.getRepository(Setting);
    
    // Fetch app settings from database
    const settings = await settingRepository.find({
      where: [{ category: 'app' }, { category: 'general' }],
    });

    // Convert to key-value object
    const result: Record<string, any> = {};
    settings.forEach(setting => {
      let value: any = setting.value;
      if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = parseInt(setting.value, 10);
      }
      result[setting.key] = value;
    });

    const appInfo = {
      version: result.app_current_version || '1.0.0',
      buildNumber: result.app_build_number || '100',
      minVersion: result.app_min_version || '1.0.0',
      forceUpdate: result.app_force_update === true || result.app_force_update === 'true',
      updateMessage: result.app_update_message || 'A new version is available with exciting features!',
      playStoreUrl: result.play_store_url || '',
      appStoreUrl: result.app_store_url || '',
      privacyPolicyUrl: result.privacy_policy_url || '/privacy-policy',
      termsUrl: result.terms_url || '/terms-of-service',
      maintenanceMode: result.maintenance_mode === true || result.maintenance_mode === 'true',
      maintenanceMessage: result.maintenance_message || 'We are currently under maintenance. Please check back soon.',
    };

    res.json({ success: true, data: appInfo });
  } catch (error) {
    next(error);
  }
});

export default router;
