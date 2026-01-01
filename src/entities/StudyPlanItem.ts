import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { StudyPlan } from './StudyPlan';
import { Topic } from './Topic';

export enum ItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('study_plan_items')
@Index(['studyPlanId', 'scheduledDate'])
export class StudyPlanItem extends BaseEntity {
  @ManyToOne(() => StudyPlan, (plan) => plan.items)
  @JoinColumn({ name: 'study_plan_id' })
  studyPlan: StudyPlan;

  @Column({ name: 'study_plan_id' })
  studyPlanId: string;

  @ManyToOne(() => Topic)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ name: 'topic_id' })
  topicId: string;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: Date;

  @Column({ nullable: true, name: 'scheduled_time', type: 'time' })
  scheduledTime?: string;

  @Column({ default: 30, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.PENDING,
  })
  status: ItemStatus;

  @Column({ nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;
}
