import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { StudyPlan } from './StudyPlan';
import { Topic } from './Topic';
import { ItemStatus } from './enums';

export { ItemStatus };

@Entity('study_plan_items')
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

  @Column({ nullable: true, type: 'time', name: 'scheduled_time' })
  scheduledTime?: string;

  @Column({ default: 30, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.PENDING,
  })
  status: ItemStatus;

  @Column({ nullable: true, type: 'timestamp', name: 'completed_at' })
  completedAt?: Date;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;
}
