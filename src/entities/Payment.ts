import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { PaymentStatus, PaymentGateway } from './enums';

export { PaymentStatus, PaymentGateway };

@Entity('payments')
export class Payment extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true, name: 'gateway_order_id', length: 255 })
  gatewayOrderId?: string;

  @Column({ nullable: true, name: 'gateway_payment_id', length: 255 })
  gatewayPaymentId?: string;

  @Column({ nullable: true, name: 'gateway_signature', type: 'text' })
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

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: Record<string, any>;

  @Column({ nullable: true, name: 'refund_id', length: 255 })
  refundId?: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, name: 'refund_amount' })
  refundAmount?: number;

  @Column({ nullable: true, type: 'timestamp', name: 'refunded_at' })
  refundedAt?: Date;

  @Column({ nullable: true, type: 'text', name: 'invoice_url' })
  invoiceUrl?: string;
}
