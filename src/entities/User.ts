import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { UserSubscription } from './UserSubscription';
import { Payment } from './Payment';
import { Notification } from './Notification';

export enum UserRole {
  PARENT = 'parent',
  STUDENT = 'student',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 100, name: 'full_name' })
  fullName: string;

  @Index({ unique: true })
  @Column({ length: 255, unique: true, nullable: true })
  email?: string;

  @Index({ unique: true })
  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ nullable: true, select: false })
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

  @Column({ nullable: true, name: 'google_id' })
  googleId?: string;

  @Column({ nullable: true, name: 'facebook_id' })
  facebookId?: string;

  @Column({ nullable: true, name: 'profile_image_url' })
  profileImageUrl?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_email_verified' })
  isEmailVerified: boolean;

  @Column({ default: false, name: 'is_phone_verified' })
  isPhoneVerified: boolean;

  @Column({ nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date;

  @Column({ nullable: true, name: 'fcm_token' })
  fcmToken?: string;

  @Column({ nullable: true, name: 'refresh_token', select: false })
  refreshToken?: string;

  // Relations
  @OneToMany(() => Student, (student) => student.user)
  students: Student[];

  @OneToMany(() => UserSubscription, (subscription) => subscription.user)
  subscriptions: UserSubscription[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
