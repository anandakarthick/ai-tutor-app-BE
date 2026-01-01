import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { OtpPurpose } from './enums';

export { OtpPurpose };

@Entity('otps')
export class Otp extends BaseEntity {
  @Column({ length: 255 })
  identifier: string; // Phone or email

  @Column({ length: 10 })
  code: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.LOGIN,
  })
  purpose: OtpPurpose;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false, name: 'is_used' })
  isUsed: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'used_at' })
  usedAt?: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true, name: 'ip_address', length: 50 })
  ipAddress?: string;

  @Column({ nullable: true, name: 'user_agent', type: 'text' })
  userAgent?: string;
}
