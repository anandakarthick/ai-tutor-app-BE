import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { SubscriptionPlan } from './SubscriptionPlan';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  TRIAL = 'trial',
}

@Entity('user_subscriptions')
@Index(['userId', 'status'])
export class UserSubscription extends BaseEntity {
  @ManyToOne(() => User, (user) => user.subscriptions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'plan_id' })
  planId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  @Column({ default: false, name: 'auto_renew' })
  autoRenew: boolean;

  @Column({ nullable: true, name: 'payment_id' })
  paymentId?: string;

  @Column({ nullable: true, name: 'coupon_code', length: 50 })
  couponCode?: string;

  @Column({ default: 0, name: 'discount_amount', type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;
}
