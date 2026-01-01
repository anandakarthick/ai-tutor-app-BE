import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum OtpPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  PHONE_VERIFICATION = 'phone_verification',
  EMAIL_VERIFICATION = 'email_verification',
}

@Entity('otps')
@Index(['identifier', 'purpose', 'isUsed'])
export class Otp extends BaseEntity {
  @Column({ length: 255 })
  identifier: string;

  @Column({ length: 10 })
  code: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.LOGIN,
  })
  purpose: OtpPurpose;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false, name: 'is_used' })
  isUsed: boolean;

  @Column({ nullable: true, name: 'used_at' })
  usedAt?: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true, name: 'ip_address', length: 50 })
  ipAddress?: string;

  @Column({ nullable: true, name: 'user_agent', type: 'text' })
  userAgent?: string;
}
