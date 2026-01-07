import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import bcrypt from 'bcryptjs';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ length: 100, name: 'full_name' })
  fullName: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ type: 'text', select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  role: AdminRole;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: string[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ nullable: true, name: 'last_login_at', type: 'timestamp' })
  lastLoginAt?: Date;

  @Column({ nullable: true, name: 'profile_image_url', type: 'text' })
  profileImageUrl?: string;

  @Column({ nullable: true, name: 'refresh_token', type: 'text', select: false })
  refreshToken?: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  async hashPassword() {
    if (this.password && !this.password.startsWith('$2a$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}
