import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { SubscriptionPlan } from './SubscriptionPlan';
import { SubscriptionStatus } from './enums';

export { SubscriptionStatus };

@Entity('user_subscriptions')
export class UserSubscription extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => SubscriptionPlan)
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

  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'cancelled_at' })
  cancelledAt?: Date;

  @Column({ default: false, name: 'auto_renew' })
  autoRenew: boolean;

  @Column({ nullable: true, name: 'payment_id', length: 255 })
  paymentId?: string;

  @Column({ nullable: true, name: 'coupon_code', length: 50 })
  couponCode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'final_amount' })
  finalAmount: number;
}
