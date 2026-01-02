import { Entity, Column, OneToMany, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { UserRole, AuthProvider } from './enums';

export { UserRole, AuthProvider };

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 100, name: 'full_name' })
  fullName: string;

  @Index({ unique: true })
  @Column({ nullable: true, length: 255 })
  email?: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone: string;

  @Column({ nullable: true, type: 'text', select: false })
  password?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PARENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
    name: 'auth_provider',
  })
  authProvider: AuthProvider;

  @Column({ nullable: true, name: 'google_id', length: 255 })
  googleId?: string;

  @Column({ nullable: true, name: 'facebook_id', length: 255 })
  facebookId?: string;

  @Column({ nullable: true, name: 'profile_image_url', type: 'text' })
  profileImageUrl?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_email_verified' })
  isEmailVerified: boolean;

  @Column({ default: false, name: 'is_phone_verified' })
  isPhoneVerified: boolean;

  @Column({ nullable: true, name: 'last_login_at', type: 'timestamp' })
  lastLoginAt?: Date;

  @Column({ nullable: true, name: 'fcm_token', type: 'text' })
  fcmToken?: string;

  @Column({ nullable: true, name: 'refresh_token', type: 'text', select: false })
  refreshToken?: string;

  // Active session ID for single device login
  @Column({ nullable: true, name: 'active_session_id', length: 255 })
  activeSessionId?: string;

  // Device info for the active session
  @Column({ nullable: true, name: 'active_device_info', type: 'text' })
  activeDeviceInfo?: string;

  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    name: 'notification_preferences',
    default: () => `'{"masterEnabled":true,"studyReminders":true,"quizAlerts":true,"achievements":true,"newContent":true,"tips":false,"promotions":false}'::jsonb`
  })
  notificationPreferences?: {
    masterEnabled: boolean;
    studyReminders: boolean;
    quizAlerts: boolean;
    achievements: boolean;
    newContent: boolean;
    tips: boolean;
    promotions: boolean;
  };

  // Relations
  @OneToMany(() => Student, (student) => student.user)
  students: Student[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
