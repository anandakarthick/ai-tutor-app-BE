import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';

export enum NotificationType {
  SYSTEM = 'system',
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
  QUIZ = 'quiz',
  SUBSCRIPTION = 'subscription',
  STREAK = 'streak',
  PROMOTION = 'promotion',
  UPDATE = 'update',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
export class Notification extends BaseEntity {
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
    name: 'notification_type',
  })
  notificationType: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ nullable: true, name: 'action_url' })
  actionUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ nullable: true, name: 'read_at' })
  readAt?: Date;

  @Column({ default: false, name: 'is_push_sent' })
  isPushSent: boolean;

  @Column({ nullable: true, name: 'push_sent_at' })
  pushSentAt?: Date;

  @Column({ nullable: true, name: 'expires_at' })
  expiresAt?: Date;
}
