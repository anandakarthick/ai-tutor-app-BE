import { Router, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import AppDataSource from '../config/database';
import { Payment, PaymentStatus, PaymentGateway } from '../entities/Payment';
import { SubscriptionPlan } from '../entities/SubscriptionPlan';
import { UserSubscription, SubscriptionStatus } from '../entities/UserSubscription';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Initialize Razorpay lazily to prevent startup failures
let razorpayInstance: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
  if (!razorpayInstance) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      console.warn('[Payment] Razorpay keys not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId || 'rzp_test_dummy',
      key_secret: config.razorpay.keySecret || 'dummy_secret',
    });
  }
  return razorpayInstance;
};

console.log('[Payment] Payment routes loaded');

/**
 * @route   GET /api/v1/payments/test
 * @desc    Test route to verify payment routes are working
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Payment routes working!' });
});

/**
 * @route   POST /api/v1/payments/test-post
 * @desc    Test POST route
 * @access  Public
 */
router.post('/test-post', (req, res) => {
  console.log('[Payment] Test POST received:', req.body);
  res.json({ success: true, message: 'POST works!', received: req.body });
});

/**
 * @route   POST /api/v1/payments/test-auth
 * @desc    Test POST route with authentication
 * @access  Private
 */
router.post('/test-auth', authenticate, (req: AuthRequest, res) => {
  console.log('[Payment] Test Auth POST received:', req.body);
  console.log('[Payment] User:', req.user);
  res.json({ success: true, message: 'Auth POST works!', received: req.body, user: req.user });
});

/**
 * @route   POST /api/v1/payments/create-order
 * @desc    Create Razorpay order for subscription
 * @access  Private
 */
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('[Payment] ========== CREATE ORDER START ==========');
  console.log('[Payment] Request body:', JSON.stringify(req.body, null, 2));
  console.log('[Payment] User:', req.user);
  
  try {
    const { planId } = req.body;

    console.log('[Payment] Create order request received:', { planId });

    if (!planId) {
      throw new AppError('Plan ID is required', 400, 'PLAN_REQUIRED');
    }

    // Get the subscription plan
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plan = await planRepository.findOne({ where: { id: planId, isActive: true } });

    if (!plan) {
      throw new AppError('Plan not founds', 404, 'PLAN_NOT_FOUND');
    }

    const amount = plan.price;
    const currency = plan.currency || 'INR';

    console.log(`[Payment] Creating order for plan: ${plan.displayName}, amount: ₹${amount}`);

    // Create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}_${req.user!.userId.substring(0, 8)}`,
      notes: {
        userId: req.user!.userId,
        planId: plan.id,
        planName: plan.displayName,
      },
    });

    console.log(`[Payment] Razorpay order created: ${order.id}`);

    // Create payment record
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payment = paymentRepository.create({
      userId: req.user!.userId,
      gatewayOrderId: order.id,
      gateway: PaymentGateway.RAZORPAY,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      description: `${plan.displayName} Subscription`,
      metadata: { 
        planId: plan.id, 
        planName: plan.displayName,
        durationMonths: plan.durationMonths,
      },
    });

    await paymentRepository.save(payment);
    console.log(`[Payment] Payment record created: ${payment.id}`);

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment.id,
        keyId: config.razorpay.keyId,
        plan: {
          id: plan.id,
          name: plan.displayName,
          price: plan.price,
          durationMonths: plan.durationMonths,
        },
      },
    });
  } catch (error: any) {
    console.error('[Payment] Create order error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify Razorpay payment and create subscription
 * @access  Private
 */
router.post('/verify', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    console.log(`[Payment] Verifying payment: ${razorpay_payment_id}`);

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error('[Payment] Signature verification failed');
      throw new AppError('Payment verification failed', 400, 'INVALID_SIGNATURE');
    }

    console.log('[Payment] Signature verified successfully');

    // Update payment record
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payment = await paymentRepository.findOne({
      where: { gatewayOrderId: razorpay_order_id },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    payment.gatewayPaymentId = razorpay_payment_id;
    payment.gatewaySignature = razorpay_signature;
    payment.status = PaymentStatus.SUCCESS;
    await paymentRepository.save(payment);

    console.log(`[Payment] Payment status updated to SUCCESS: ${payment.id}`);

    // Get plan from payment metadata or request
    const actualPlanId = planId || payment.metadata?.planId;
    
    if (!actualPlanId) {
      throw new AppError('Plan ID not found', 400, 'PLAN_NOT_FOUND');
    }

    // Get plan details
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plan = await planRepository.findOne({ where: { id: actualPlanId } });

    if (!plan) {
      throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }

    // Cancel any existing active subscriptions
    const subscriptionRepository = AppDataSource.getRepository(UserSubscription);
    await subscriptionRepository.update(
      { userId: req.user!.userId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() }
    );

    // Create new subscription
    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + plan.durationMonths);

    const subscription = subscriptionRepository.create({
      userId: req.user!.userId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      startedAt: startDate,
      expiresAt,
      paymentId: payment.id,
      finalAmount: payment.amount,
      discountAmount: 0,
      autoRenew: false,
    });

    await subscriptionRepository.save(subscription);
    console.log(`[Payment] Subscription created: ${subscription.id}, expires: ${expiresAt}`);

    // Load full subscription with plan
    const fullSubscription = await subscriptionRepository.findOne({
      where: { id: subscription.id },
      relations: ['plan'],
    });

    res.json({
      success: true,
      message: 'Payment verified and subscription activated!',
      data: {
        payment,
        subscription: fullSubscription,
      },
    });
  } catch (error: any) {
    console.error('[Payment] Verify error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/payments
 * @desc    Get user's payments with subscription info
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payments = await paymentRepository.find({
      where: { userId: req.user!.userId },
      order: { createdAt: 'DESC' },
    });

    // Enhance payments with plan info from metadata
    const enhancedPayments = payments.map(payment => ({
      ...payment,
      description: payment.description || (payment.metadata?.planName ? `${payment.metadata.planName} Subscription` : 'Subscription Payment'),
    }));

    res.json({ success: true, data: enhancedPayments });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payment = await paymentRepository.findOne({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Razorpay webhook handler
 * @access  Public
 */
router.post('/webhook', async (req, res: Response, next: NextFunction) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('[Webhook] Invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const paymentRepository = AppDataSource.getRepository(Payment);

    console.log(`[Webhook] Received event: ${event.event}`);

    switch (event.event) {
      case 'payment.captured':
        await paymentRepository.update(
          { gatewayPaymentId: event.payload.payment.entity.id },
          { status: PaymentStatus.SUCCESS }
        );
        console.log('[Webhook] Payment captured:', event.payload.payment.entity.id);
        break;

      case 'payment.failed':
        await paymentRepository.update(
          { gatewayOrderId: event.payload.payment.entity.order_id },
          { 
            status: PaymentStatus.FAILED,
            failureReason: event.payload.payment.entity.error_description,
          }
        );
        console.log('[Webhook] Payment failed:', event.payload.payment.entity.order_id);
        break;

      case 'refund.created':
        await paymentRepository.update(
          { gatewayPaymentId: event.payload.refund.entity.payment_id },
          {
            status: PaymentStatus.REFUNDED,
            refundId: event.payload.refund.entity.id,
            refundAmount: event.payload.refund.entity.amount / 100,
            refundedAt: new Date(),
          }
        );
        console.log('[Webhook] Refund created:', event.payload.refund.entity.id);
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    next(error);
  }
});

export default router;
