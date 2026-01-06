import { Router, Response, NextFunction } from 'express';
import AppDataSource from '../config/database';
import { SubscriptionPlan } from '../entities/SubscriptionPlan';
import { UserSubscription, SubscriptionStatus } from '../entities/UserSubscription';
import { Coupon, DiscountType } from '../entities/Coupon';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { cacheService } from '../config/redis';

const router = Router();

/**
 * @route   GET /api/v1/subscriptions/plans
 * @desc    Get all subscription plans
 * @access  Public
 */
router.get('/plans', async (req, res: Response, next: NextFunction) => {
  try {
    const cached = await cacheService.get<SubscriptionPlan[]>('subscription:plans');
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plans = await planRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', price: 'ASC' },
    });

    await cacheService.set('subscription:plans', plans, 3600); // 1 hour

    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get user's subscriptions
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const subscriptions = await subscriptionRepository.find({
      where: { userId: req.user!.userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/subscriptions/active
 * @desc    Get user's active subscription with detailed info
 * @access  Private
 */
router.get('/active', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const subscription = await subscriptionRepository.findOne({
      where: { 
        userId: req.user!.userId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
    });

    if (subscription) {
      // Calculate days remaining
      const now = new Date();
      const expiresAt = new Date(subscription.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if subscription has expired
      if (daysRemaining < 0) {
        // Update status to expired
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscriptionRepository.save(subscription);
        return res.json({ success: true, data: null });
      }

      // Add calculated fields
      const enhancedSubscription = {
        ...subscription,
        daysRemaining,
        isExpiringSoon: daysRemaining <= 7,
      };

      return res.json({ success: true, data: enhancedSubscription });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create subscription after payment
 * @access  Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId, paymentId, couponCode } = req.body;

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plan = await planRepository.findOne({ where: { id: planId } });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    let discountAmount = 0;
    let finalAmount = plan.price;

    // Apply coupon if provided
    if (couponCode) {
      const couponRepository = AppDataSource.getRepository(Coupon);
      const coupon = await couponRepository.findOne({
        where: { couponCode, isActive: true },
      });

      if (coupon && new Date() >= coupon.validFrom && new Date() <= coupon.validUntil) {
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          discountAmount = (plan.price * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = coupon.discountValue;
        }
        finalAmount = plan.price - discountAmount;

        // Increment coupon usage
        coupon.currentUses += 1;
        await couponRepository.save(coupon);
      }
    }

    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + plan.durationMonths);

    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    const subscription = subscriptionRepository.create({
      userId: req.user!.userId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      startedAt: startDate,
      expiresAt,
      paymentId,
      couponCode,
      discountAmount,
      finalAmount,
    });

    await subscriptionRepository.save(subscription);

    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/subscriptions/validate-coupon
 * @desc    Validate a coupon code
 * @access  Private
 */
router.post('/validate-coupon', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { couponCode, planId } = req.body;

    const couponRepository = AppDataSource.getRepository(Coupon);
    const coupon = await couponRepository.findOne({
      where: { couponCode, isActive: true },
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }

    res.json({
      success: true,
      data: {
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
