import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  PAYTM = 'paytm',
  UPI = 'upi',
}

@Entity('payments')
@Index(['userId', 'createdAt'])
@Index(['gatewayPaymentId'])
export class Payment extends BaseEntity {
  @ManyToOne(() => User, (user) => user.payments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true, name: 'gateway_order_id' })
  gatewayOrderId?: string;

  @Column({ nullable: true, name: 'gateway_payment_id' })
  gatewayPaymentId?: string;

  @Column({ nullable: true, name: 'gateway_signature' })
  gatewaySignature?: string;

  @Column({
    type: 'enum',
    enum: PaymentGateway,
    default: PaymentGateway.RAZORPAY,
  })
  gateway: PaymentGateway;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'INR', length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ nullable: true, name: 'payment_method', length: 50 })
  paymentMethod?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, name: 'failure_reason', type: 'text' })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true, name: 'refund_id' })
  refundId?: string;

  @Column({ nullable: true, name: 'refund_amount', type: 'decimal', precision: 10, scale: 2 })
  refundAmount?: number;

  @Column({ nullable: true, name: 'refunded_at' })
  refundedAt?: Date;

  @Column({ nullable: true, name: 'invoice_url' })
  invoiceUrl?: string;
}
