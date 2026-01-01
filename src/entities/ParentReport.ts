import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { ReportType } from './enums';

export { ReportType };

@Entity('parent_reports')
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

  @Column({ nullable: true, type: 'text', name: 'pdf_url' })
  pdfUrl?: string;

  @Column({ default: false, name: 'is_sent' })
  isSent: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'sent_at' })
  sentAt?: Date;

  @Column({ nullable: true, type: 'text', name: 'sent_to' })
  sentTo?: string;
}
