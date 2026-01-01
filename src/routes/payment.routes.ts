import { Router, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { Payment, PaymentStatus, PaymentGateway } from '../entities/Payment';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * @route   POST /api/v1/payments/create-order
 * @desc    Create Razorpay order
 * @access  Private
 */
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'INR', planId, description } = req.body;

    if (!amount || amount <= 0) {
      throw new AppError('Valid amount is required', 400, 'INVALID_AMOUNT');
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user!.userId,
        planId,
      },
    });

    // Create payment record
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payment = paymentRepository.create({
      userId: req.user!.userId,
      gatewayOrderId: order.id,
      gateway: PaymentGateway.RAZORPAY,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      description,
      metadata: { planId },
    });

    await paymentRepository.save(payment);

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment.id,
        keyId: config.razorpay.keyId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify Razorpay payment
 * @access  Private
 */
router.post('/verify', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      throw new AppError('Payment verification failed', 400, 'INVALID_SIGNATURE');
    }

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

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/payments
 * @desc    Get user's payments
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payments = await paymentRepository.find({
      where: { userId: req.user!.userId },
      order: { createdAt: 'DESC' },
    });

    res.json({ success: true, data: payments });
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
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const paymentRepository = AppDataSource.getRepository(Payment);

    switch (event.event) {
      case 'payment.captured':
        await paymentRepository.update(
          { gatewayPaymentId: event.payload.payment.entity.id },
          { status: PaymentStatus.SUCCESS }
        );
        break;

      case 'payment.failed':
        await paymentRepository.update(
          { gatewayOrderId: event.payload.payment.entity.order_id },
          { 
            status: PaymentStatus.FAILED,
            failureReason: event.payload.payment.entity.error_description,
          }
        );
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
        break;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
