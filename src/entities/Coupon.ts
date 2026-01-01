import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { DiscountType } from './enums';

export { DiscountType };

@Entity('coupons')
export class Coupon extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 50, name: 'coupon_code' })
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

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  discountValue: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, name: 'max_discount_amount' })
  maxDiscountAmount?: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, name: 'min_order_amount' })
  minOrderAmount?: number;

  @Column({ nullable: true, name: 'max_uses' })
  maxUses?: number;

  @Column({ default: 0, name: 'current_uses' })
  currentUses: number;

  @Column({ nullable: true, name: 'max_uses_per_user' })
  maxUsesPerUser?: number;

  @Column({ type: 'timestamp', name: 'valid_from' })
  validFrom: Date;

  @Column({ type: 'timestamp', name: 'valid_until' })
  validUntil: Date;

  @Column({ nullable: true, type: 'jsonb', name: 'applicable_plans' })
  applicablePlans?: string[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_first_time_only' })
  isFirstTimeOnly: boolean;
}
