import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Topic } from './Topic';
import { MasteryLevel } from './enums';

export { MasteryLevel };

@Entity('student_progress')
@Index(['studentId', 'topicId'], { unique: true })
export class StudentProgress extends BaseEntity {
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Topic)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ name: 'topic_id' })
  topicId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'progress_percentage' })
  progressPercentage: number;

  @Column({
    type: 'enum',
    enum: MasteryLevel,
    default: MasteryLevel.BEGINNER,
    name: 'mastery_level',
  })
  masteryLevel: MasteryLevel;

  @Column({ default: 0, name: 'total_time_spent_minutes' })
  totalTimeSpentMinutes: number;

  @Column({ default: 0, name: 'content_blocks_completed' })
  contentBlocksCompleted: number;

  @Column({ default: 0, name: 'quiz_attempts' })
  quizAttempts: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'best_quiz_score' })
  bestQuizScore: number;

  @Column({ default: 0, name: 'doubts_asked' })
  doubtsAsked: number;

  @Column({ nullable: true, type: 'timestamp', name: 'last_accessed_at' })
  lastAccessedAt?: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'completed_at' })
  completedAt?: Date;

  @Column({ default: 0, name: 'revision_count' })
  revisionCount: number;

  @Column({ nullable: true, type: 'date', name: 'next_revision_date' })
  nextRevisionDate?: Date;
}
