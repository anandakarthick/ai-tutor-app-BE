import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

@Entity('schools')
export class School extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 255, name: 'school_name' })
  schoolName: string;

  @Column({ nullable: true, length: 255, name: 'display_name' })
  displayName?: string;

  @Column({ nullable: true, type: 'text' })
  address?: string;

  @Column({ nullable: true, length: 100 })
  city?: string;

  @Column({ nullable: true, length: 100 })
  state?: string;

  @Column({ nullable: true, length: 10 })
  pincode?: string;

  @Column({ nullable: true, length: 100 })
  country?: string;

  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  website?: string;

  @Column({ nullable: true, name: 'principal_name', length: 100 })
  principalName?: string;

  @Column({ nullable: true, name: 'contact_person', length: 100 })
  contactPerson?: string;

  @Column({ nullable: true, name: 'contact_email', length: 255 })
  contactEmail?: string;

  @Column({ nullable: true, name: 'contact_phone', length: 20 })
  contactPhone?: string;

  @Column({ nullable: true, name: 'logo_url', type: 'text' })
  logoUrl?: string;

  @Column({ nullable: true, name: 'board_affiliation', length: 100 })
  boardAffiliation?: string;

  @Column({ nullable: true, name: 'affiliation_number', length: 50 })
  affiliationNumber?: string;

  @Column({ default: 0, name: 'student_count' })
  studentCount: number;

  @Column({ default: 0, name: 'active_subscriptions' })
  activeSubscriptions: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_partner' })
  isPartner: boolean;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: Record<string, any>;
}
