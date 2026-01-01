import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { NotificationType, NotificationPriority } from './enums';

export { NotificationType, NotificationPriority };

@Entity('notifications')
export class Notification extends BaseEntity {
  @ManyToOne(() => User)
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

  @Column({ nullable: true, type: 'text', name: 'image_url' })
  imageUrl?: string;

  @Column({ nullable: true, type: 'text', name: 'action_url' })
  actionUrl?: string;

  @Column({ nullable: true, type: 'jsonb' })
  data?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'read_at' })
  readAt?: Date;

  @Column({ default: false, name: 'is_push_sent' })
  isPushSent: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'push_sent_at' })
  pushSentAt?: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'expires_at' })
  expiresAt?: Date;
}
