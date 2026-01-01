import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { UserSubscription } from './UserSubscription';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  @Column({ length: 100, name: 'plan_name' })
  planName: string;

  @Column({ length: 255, name: 'display_name' })
  displayName: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true, name: 'original_price', type: 'decimal', precision: 10, scale: 2 })
  originalPrice?: number;

  @Column({ default: 'INR', length: 3 })
  currency: string;

  @Column({ name: 'duration_months' })
  durationMonths: number;

  @Column({ default: 1, name: 'max_students' })
  maxStudents: number;

  @Column({ default: 30, name: 'ai_minutes_per_day' })
  aiMinutesPerDay: number;

  @Column({ type: 'jsonb', nullable: true })
  features?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'doubt_types' })
  doubtTypes?: string[];

  @Column({ default: false, name: 'has_live_sessions' })
  hasLiveSessions: boolean;

  @Column({ default: false, name: 'has_personal_mentor' })
  hasPersonalMentor: boolean;

  @Column({ default: 'email', name: 'support_type', length: 50 })
  supportType: string;

  @Column({ default: 'weekly', name: 'report_frequency', length: 20 })
  reportFrequency: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_popular' })
  isPopular: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => UserSubscription, (sub) => sub.plan)
  subscriptions: UserSubscription[];
}
