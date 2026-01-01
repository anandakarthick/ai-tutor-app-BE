import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  TERM = 'term',
  CUSTOM = 'custom',
}

@Entity('parent_reports')
@Index(['studentId', 'reportType', 'createdAt'])
export class ParentReport extends BaseEntity {
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.WEEKLY,
    name: 'report_type',
  })
  reportType: ReportType;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'jsonb', name: 'report_data' })
  reportData: Record<string, any>;

  @Column({ nullable: true, name: 'pdf_url' })
  pdfUrl?: string;

  @Column({ default: false, name: 'is_sent' })
  isSent: boolean;

  @Column({ nullable: true, name: 'sent_at' })
  sentAt?: Date;

  @Column({ nullable: true, name: 'sent_to', type: 'text' })
  sentTo?: string;
}
