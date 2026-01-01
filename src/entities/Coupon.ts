import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('coupons')
@Index(['couponCode'], { unique: true })
export class Coupon extends BaseEntity {
  @Column({ length: 50, unique: true, name: 'coupon_code' })
  couponCode: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
    name: 'discount_type',
  })
  discountType: DiscountType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ nullable: true, name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2 })
  maxDiscountAmount?: number;

  @Column({ nullable: true, name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2 })
  minOrderAmount?: number;

  @Column({ nullable: true, name: 'max_uses' })
  maxUses?: number;

  @Column({ default: 0, name: 'current_uses' })
  currentUses: number;

  @Column({ nullable: true, name: 'max_uses_per_user' })
  maxUsesPerUser?: number;

  @Column({ name: 'valid_from' })
  validFrom: Date;

  @Column({ name: 'valid_until' })
  validUntil: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'applicable_plans' })
  applicablePlans?: string[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_first_time_only' })
  isFirstTimeOnly: boolean;
}
