import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { StudyPlanItem } from './StudyPlanItem';

export enum PlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

@Entity('study_plans')
export class StudyPlan extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.studyPlans)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ length: 255, name: 'plan_title' })
  planTitle: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ default: 2, name: 'daily_hours' })
  dailyHours: number;

  @Column({ type: 'jsonb', nullable: true, name: 'target_subjects' })
  targetSubjects?: string[];

  @Column({ nullable: true, name: 'target_exam', length: 100 })
  targetExam?: string;

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.ACTIVE,
  })
  status: PlanStatus;

  @Column({ default: 0, name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2 })
  completionPercentage: number;

  @Column({ default: false, name: 'is_ai_generated' })
  isAiGenerated: boolean;

  // Relations
  @OneToMany(() => StudyPlanItem, (item) => item.studyPlan)
  items: StudyPlanItem[];
}
